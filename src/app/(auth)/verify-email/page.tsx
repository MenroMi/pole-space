import { resendVerificationAction } from '@/features/auth';

type Props = {
  searchParams: Promise<{ sent?: string; error?: string; email?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { sent, error, email } = await searchParams;

  if (sent) {
    return (
      <main>
        <h1>Check your email</h1>
        <p>We sent a verification link to your inbox. It expires in 24 hours.</p>
      </main>
    );
  }

  if (error === 'expired' && email) {
    const resendWithEmail = resendVerificationAction.bind(null, email);
    return (
      <main>
        <h1>Link expired</h1>
        <p>Your verification link has expired.</p>
        <form action={resendWithEmail}>
          <button type="submit">Resend verification email</button>
        </form>
      </main>
    );
  }

  if (error === 'invalid' || error === 'expired' || error === 'server') {
    const message =
      error === 'server'
        ? 'We could not verify your email. Please try again later.'
        : 'This verification link is invalid. Please sign up again.';
    const heading = error === 'server' ? 'Something went wrong' : 'Invalid link';
    return (
      <main>
        <h1>{heading}</h1>
        <p>{message}</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Verify your email</h1>
      <p>Please check your inbox and click the verification link.</p>
    </main>
  );
}
