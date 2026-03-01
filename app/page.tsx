import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect unauthenticated users directly to login
  // Authenticated users are redirected to their portal by middleware
  redirect('/login');
}
