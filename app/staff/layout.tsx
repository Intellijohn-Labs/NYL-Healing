import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'NYL Reception',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#10231c',
  viewportFit: 'cover',
};

// Every staff screen uses the dark green "glass" theme
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div lang="en" className="staff-theme">
      {children}
    </div>
  );
}
