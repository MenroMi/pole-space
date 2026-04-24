import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SignupForm } from './SignupForm';

vi.mock('@/features/auth/actions', () => ({
  signupAction: vi.fn(),
}));

import { signupAction } from '@/features/auth/actions';
const mockSignupAction = signupAction as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SignupForm', () => {
  it('renders firstName, lastName, email, password fields and submit button', () => {
    render(<SignupForm />);
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows validation error for missing firstName on submit', async () => {
    const user = userEvent.setup();
    render(<SignupForm />);
    await user.type(screen.getByLabelText(/last name/i), 'Smith');
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'Password1!');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText('First name is required')).toBeInTheDocument();
  });

  it('shows validation error for short password on submit', async () => {
    const user = userEvent.setup();
    render(<SignupForm />);
    await user.type(screen.getByLabelText(/first name/i), 'Alice');
    await user.type(screen.getByLabelText(/last name/i), 'Smith');
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'Ab1!');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/at least 8/i)).toBeInTheDocument();
  });

  it('calls signupAction with form data on valid submit', async () => {
    mockSignupAction.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.type(screen.getByLabelText(/first name/i), 'Alice');
    await user.type(screen.getByLabelText(/last name/i), 'Smith');
    await user.type(screen.getByLabelText(/email/i), 'alice@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'Password1!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(mockSignupAction).toHaveBeenCalledWith({
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      password: 'Password1!',
    });
  });

  it('displays server error returned from signupAction', async () => {
    mockSignupAction.mockResolvedValue({ error: 'Email already in use' });
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.type(screen.getByLabelText(/first name/i), 'Alice');
    await user.type(screen.getByLabelText(/last name/i), 'Smith');
    await user.type(screen.getByLabelText(/email/i), 'alice@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'Password1!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('Email already in use')).toBeInTheDocument();
  });
});
