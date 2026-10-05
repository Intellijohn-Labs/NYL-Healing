import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NYL Reception',
  robots: { index: false, follow: false },
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <div lang="en">{children}</div>;
}
