import React from 'react';
import { BlockDisplay } from './BlockDisplay';
import type { Turn, Block } from '../../../src/lib/api/sessions';

interface TurnDisplayProps {
  turn: Turn;
}

export function TurnDisplay({ turn }: TurnDisplayProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        backgroundColor: 'rgba(156, 163, 175, 0.03)',
        border: '1px solid rgba(156, 163, 175, 0.1)',
        borderRadius: '8px',
      }}
    >
      {/* User Input */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#3b82f6',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: '600',
            flexShrink: 0,
          }}
        >
          U
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: '500' }}>User</span>
            <span style={{ fontSize: '11px', color: 'rgba(156, 163, 175, 0.6)' }}>
              {formatTime(turn.createdAt)}
            </span>
          </div>
          <div
            style={{
              fontSize: '14px',
              lineHeight: '1.5',
              color: 'var(--foreground)',
            }}
          >
            {turn.userPrompt}
          </div>
        </div>
      </div>

      {/* Claude Response */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: '600',
            flexShrink: 0,
          }}
        >
          C
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: '500' }}>Claude Code</span>
            <TurnStatusBadge status={turn.status} />
            {turn.status === 'running' && <LoadingDots />}
          </div>
          
          {/* Blocks */}
          {(!turn.blocks || turn.blocks.length === 0) && turn.status === 'running' ? (
            <div
              style={{
                fontSize: '14px',
                color: 'rgba(156, 163, 175, 0.6)',
                fontStyle: 'italic',
              }}
            >
              Processing...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {turn.blocks?.map((block) => (
                <BlockDisplay key={block.id} block={block} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TurnStatusBadge({ status }: { status: Turn['status'] }) {
  const statusConfig = {
    pending: { color: '#6b7280', label: 'Pending' },
    running: { color: '#3b82f6', label: 'Running' },
    completed: { color: '#10b981', label: 'Completed' },
    failed: { color: '#ef4444', label: 'Failed' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span
      style={{
        padding: '2px 6px',
        fontSize: '10px',
        fontWeight: '500',
        color: config.color,
        backgroundColor: `${config.color}20`,
        border: `1px solid ${config.color}40`,
        borderRadius: '3px',
        textTransform: 'uppercase',
      }}
    >
      {config.label}
    </span>
  );
}

function LoadingDots() {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes pulse {
              0%, 60%, 100% {
                opacity: 0.3;
              }
              30% {
                opacity: 1;
              }
            }
          `,
        }}
      />
      <span
        style={{
          display: 'inline-flex',
          gap: '2px',
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              animation: `pulse 1.4s infinite ease-in-out`,
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </span>
    </>
  );
}