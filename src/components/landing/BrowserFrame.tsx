interface BrowserFrameProps {
  url: string;
  children: React.ReactNode;
}

export function BrowserFrame({ url, children }: BrowserFrameProps) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid var(--border-default)',
        overflow: 'hidden',
        background: 'var(--background-secondary)',
        boxShadow: '0 40px 80px -20px rgba(0,0,0,0.22)',
      }}
    >
      {/* Browser chrome */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {/* Traffic light dots */}
        <div style={{ display: 'flex', gap: 6 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'var(--border-default)',
            }}
          />
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'var(--border-default)',
            }}
          />
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'var(--border-default)',
            }}
          />
        </div>
        {/* URL bar */}
        <div
          style={{
            flex: 1,
            padding: '4px 12px',
            borderRadius: 6,
            background: 'var(--background-primary)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.75rem',
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-sans)',
            letterSpacing: '0.01em',
          }}
        >
          {url}
        </div>
      </div>
      {/* Content */}
      <div style={{ lineHeight: 0 }}>{children}</div>
    </div>
  );
}
