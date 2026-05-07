"use client";

import { useState } from 'react';
import { z } from 'zod';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { Send, Leaf, Loader2, Wallet, Receipt, Users, ArrowRight, X } from 'lucide-react';
import { calculateBalances, Expense } from '../lib/math';
import './globals.css';

const google = createGoogleGenerativeAI({
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
});

// Define the schema for what the AI should extract from the natural language
const aiIntentSchema = z.object({
  newProfiles: z.array(z.object({
    name: z.string(),
    preferences: z.string()
  })).optional(),
  newExpenses: z.array(z.object({
    id: z.string(),
    description: z.string(),
    amount: z.number(),
    paidBy: z.string(),
    date: z.string(),
    splitBetween: z.array(z.string()) // AI determines who shares the cost based on preferences
  })).optional()
});

type TripState = {
  profiles: Profile[];
  totalSpent: number;
  expenses: Expense[];
  balances: { personOwning: string; personOwed: string; amount: number }[];
};

export type Profile = {
  name: string;
  preferences: string;
};

export default function Dashboard() {
  // State
  const [tripState, setTripState] = useState<TripState>({
    profiles: [],
    totalSpent: 0,
    expenses: [],
    balances: []
  });
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Profile Form state
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfilePref, setNewProfilePref] = useState('');

  const handleAddProfile = () => {
    if (newProfileName.trim()) {
      setTripState(prev => ({
        ...prev,
        profiles: [...prev.profiles, { name: newProfileName.trim(), preferences: newProfilePref.trim() }]
      }));
      setNewProfileName('');
      setNewProfilePref('');
    }
  };

  const handleRemoveProfile = (indexToRemove: number) => {
    setTripState(prev => ({
      ...prev,
      profiles: prev.profiles.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleMagicSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const command = input;
    setInput('');
    setIsLoading(true);

    try {
      const { object } = await generateObject({
        model: google('gemini-2.5-flash'),
        schema: aiIntentSchema,
        system: `You are the Natural Language Parser for SettleMint, an expert AI accountant.
Your ONLY job is to extract structured data from the user's command. DO NOT do complex math.

RULES:
1. If the user mentions new people or updates preferences, extract them into 'newProfiles'.
2. If the user logs an expense, extract it into 'newExpenses'. 
3. CAREFULLY determine 'splitBetween': It must be an array of exact names. 
   - If the user implies the group, list all profile names. 
   - STRICT EXCLUSIONS: If the expense is for meat/steak/chicken/non-veg, DO NOT include profiles marked 'veg' or 'vegan'. If the expense is for alcohol/beers/shots/drinks, DO NOT include profiles marked 'non-drinker'. You must filter the 'splitBetween' array accurately!
4. CURRENCY: Assume all numbers, amounts, and costs are in Indian Rupees (₹) unless explicitly stated otherwise.

CURRENT PROFILES IN SYSTEM: ${tripState.profiles.map(p => `${p.name} (Preferences: ${p.preferences || 'none'})`).join(', ')}`,
        prompt: `USER COMMAND:\n${command}`
      });

      setTripState(prev => {
        // 1. Merge Profiles
        let updatedProfiles = [...prev.profiles];
        if (object.newProfiles) {
          object.newProfiles.forEach(newP => {
            const existing = updatedProfiles.find(p => p.name.toLowerCase() === newP.name.toLowerCase());
            if (existing) {
              existing.preferences = newP.preferences;
            } else {
              updatedProfiles.push(newP);
            }
          });
        }

        // 2. Merge Expenses
        const updatedExpenses = [...prev.expenses, ...(object.newExpenses || [])];

        // 3. Deterministic Math!
        const newTotal = updatedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const newBalances = calculateBalances(updatedExpenses);

        return {
          profiles: updatedProfiles,
          expenses: updatedExpenses,
          totalSpent: newTotal,
          balances: newBalances
        };
      });
    } catch (error) {
      console.error(error);
      alert("Oops, the AI failed to process that expense. Make sure your API key is valid and you didn't exceed quotas.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleMagicSubmit();
  };

  return (
    <>
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>

      <nav className="top-nav">
        <div className="logo">
          <Leaf color="#10b981" size={28} />
          <h2>SettleMint</h2>
        </div>
      </nav>

      <div className="dashboard-container">
        
        {/* Total Cost Card */}
        <div className="bento-card card-total">
          <div>
            <div className="bento-header" style={{marginBottom: 8}}>
              <Wallet size={20} className="icon" /> Trip Total
            </div>
            <p style={{color: 'var(--text-secondary)'}}>Total amount spent by the group</p>
          </div>
          <h1>₹{tripState.totalSpent.toFixed(2)}</h1>
        </div>

        {/* Profiles Card */}
        <div className="bento-card card-profiles">
          <div className="bento-header">
            <Users size={20} className="icon" /> Group Members
          </div>
          <div className="scrollable-list">
            {tripState.profiles.length === 0 ? (
              <p style={{color: 'var(--text-secondary)', fontSize: 14}}>No members added yet. Type them in the Magic Input or add below!</p>
            ) : (
              tripState.profiles.map((p, i) => (
                <div key={i} className="profile-item">
                  <div>
                    <strong style={{color: 'white'}}>{p.name}</strong>
                    {p.preferences && <div style={{fontSize: 12, color: 'var(--text-secondary)'}}>{p.preferences}</div>}
                  </div>
                  <button className="remove-btn" onClick={() => handleRemoveProfile(i)}><X size={16} /></button>
                </div>
              ))
            )}
          </div>
          
          <div style={{marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8}}>
            <input 
              type="text" 
              placeholder="Name (e.g. Sarah)" 
              value={newProfileName}
              onChange={e => setNewProfileName(e.target.value)}
              style={{padding: '10px 12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.3)', color: 'white', outline: 'none', fontFamily: 'var(--font-family)'}}
            />
            <input 
              type="text" 
              placeholder="Preferences (e.g. Vegan)" 
              value={newProfilePref}
              onChange={e => setNewProfilePref(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddProfile()}
              style={{padding: '10px 12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.3)', color: 'white', outline: 'none', fontFamily: 'var(--font-family)'}}
            />
            <button onClick={handleAddProfile} style={{padding: 10, background: 'rgba(16, 185, 129, 0.2)', color: 'var(--mint-primary)', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-family)'}}>
              Add Member
            </button>
          </div>
        </div>

        {/* Recent Expenses Feed */}
        <div className="bento-card card-feed">
          <div className="bento-header">
            <Receipt size={20} className="icon" /> Recent Expenses
          </div>
          <div className="scrollable-list">
            {tripState.expenses.length === 0 ? (
               <p style={{color: 'var(--text-secondary)', fontSize: 14}}>Your feed is empty. Use the Magic Input below to add an expense.</p>
            ) : (
               [...tripState.expenses].reverse().map(exp => (
                 <div key={exp.id} className="expense-item">
                   <div className="expense-info">
                     <p>{exp.description}</p>
                     <span>Paid by {exp.paidBy} on {exp.date}</span>
                   </div>
                   <div className="expense-amount">₹{exp.amount.toFixed(2)}</div>
                 </div>
               ))
            )}
          </div>
        </div>

        {/* Balances Card */}
        <div className="bento-card card-balances">
          <div className="bento-header">
            <ArrowRight size={20} className="icon" /> Who Owes Who
          </div>
          <div className="scrollable-list">
            {tripState.balances.length === 0 ? (
               <p style={{color: 'var(--text-secondary)', fontSize: 14}}>Balances are settled! Nobody owes anyone anything.</p>
            ) : (
               tripState.balances.map((bal, i) => (
                 <div key={i} className="balance-item">
                   <div className="balance-text">
                     <strong>{bal.personOwning}</strong> owes <strong>{bal.personOwed}</strong>
                   </div>
                   <div className="balance-amount">₹{bal.amount.toFixed(2)}</div>
                 </div>
               ))
            )}
          </div>
        </div>

      </div>

      {/* Magic Input */}
      <div className="magic-input-container">
        {isLoading && (
          <div className="loader-overlay">
            <Loader2 size={16} className="animate-spin" /> Calculating perfect splits...
          </div>
        )}
        <div className="magic-input-wrapper">
          <input
            type="text"
            className="magic-input"
            placeholder="Type what happened... (e.g. John paid ₹500 for pizza)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isLoading}
          />
          <button className="btn-magic-send" onClick={handleMagicSubmit} disabled={isLoading}>
            <Send size={20} />
          </button>
        </div>
      </div>
    </>
  );
}
