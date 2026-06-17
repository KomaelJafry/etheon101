import { redirect } from 'next/navigation';

// /account/status redirects to /account (canonical route)
export default function AccountStatusRedirect() {
  redirect('/account');
}
