"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

type EntityType = 'ip' | 'host' | 'user' | 'hash';

interface EntityContextProps {
  isOpen: boolean;
  entityType: EntityType | null;
  entityValue: string | null;
  entityHistory: { type: EntityType; value: string }[];
  openEntity: (type: EntityType, value: string) => void;
  goBack: () => void;
  closeEntity: () => void;
}

const EntityContext = createContext<EntityContextProps | undefined>(undefined);

export function EntityProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [entityType, setEntityType] = useState<EntityType | null>(null);
  const [entityValue, setEntityValue] = useState<string | null>(null);
  const [entityHistory, setEntityHistory] = useState<{ type: EntityType; value: string }[]>([]);

  const openEntity = (type: EntityType, value: string) => {
    if (entityType && entityValue && (entityType !== type || entityValue !== value)) {
      setEntityHistory(prev => [...prev, { type: entityType, value: entityValue }]);
    } else if (!isOpen) {
      setEntityHistory([]);
    }
    setEntityType(type);
    setEntityValue(value);
    setIsOpen(true);
  };

  const goBack = () => {
    if (entityHistory.length > 0) {
      const prev = entityHistory[entityHistory.length - 1];
      setEntityHistory(h => h.slice(0, -1));
      setEntityType(prev.type);
      setEntityValue(prev.value);
    } else {
      closeEntity();
    }
  };

  const closeEntity = () => {
    setIsOpen(false);
    setTimeout(() => {
      setEntityType(null);
      setEntityValue(null);
      setEntityHistory([]);
    }, 300); // Wait for animation
  };

  return (
    <EntityContext.Provider value={{ isOpen, entityType, entityValue, entityHistory, openEntity, goBack, closeEntity }}>
      {children}
    </EntityContext.Provider>
  );
}

export function useEntity() {
  const context = useContext(EntityContext);
  if (!context) {
    throw new Error('useEntity must be used within an EntityProvider');
  }
  return context;
}
