import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatContactSharingBar from '../components/chat/ChatContactSharingBar.jsx';
import chatService from '../services/chat.service.js';

vi.mock('../services/chat.service.js', () => ({
  default: {
    updatePhone: vi.fn(),
  },
}));

describe('ChatContactSharingBar Component (Step 12)', () => {
  const baseConversation = {
    id: 10,
    user_a_id: 1,
    user_b_id: 2,
    my_share: false,
    other_shared: false,
    both_shared: false,
    me_confirmed: false,
    other_confirmed: false,
    both_confirmed: false,
    roommate_status: 'none',
  };

  const partner = {
    id: 2,
    full_name: 'Rohan Verma',
    college_name: 'MANIT Bhopal',
    city: 'Bhopal',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Share my contact" toggle with plain-language explanation and "Waiting for them to agree" badge', () => {
    render(
      <ChatContactSharingBar
        conversation={baseConversation}
        partner={partner}
      />
    );

    expect(screen.getByLabelText(/share my contact/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/share my contact/i)).not.toBeChecked();
    expect(
      screen.getByText(/your contact is revealed only when both of you agree/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/waiting for them to agree/i)).toBeInTheDocument();
    expect(screen.queryByTestId('contact-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('congratulations-banner')).not.toBeInTheDocument();
  });

  it('shows "They agreed" badge when other user agreed', () => {
    const convWithOtherAgreed = {
      ...baseConversation,
      my_share: false,
      other_shared: true,
      both_shared: false,
    };

    render(
      <ChatContactSharingBar
        conversation={convWithOtherAgreed}
        partner={partner}
      />
    );

    expect(screen.getByText(/they agreed/i)).toBeInTheDocument();
    expect(screen.queryByText(/waiting for them to agree/i)).not.toBeInTheDocument();
  });

  it('calls onToggleShare when user toggles "Share my contact"', () => {
    const mockToggle = vi.fn();

    render(
      <ChatContactSharingBar
        conversation={baseConversation}
        partner={partner}
        onToggleShare={mockToggle}
      />
    );

    const toggle = screen.getByLabelText(/share my contact/i);
    fireEvent.click(toggle);

    expect(mockToggle).toHaveBeenCalledWith(true);
  });

  it('renders contact card with email, phone, and copy buttons when both users share contact', async () => {
    const convBothAgreed = {
      ...baseConversation,
      my_share: true,
      other_shared: true,
      both_shared: true,
    };

    const contactDetails = {
      email: 'rohan@manit.ac.in',
      phone: '+919876543210',
    };

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });

    render(
      <ChatContactSharingBar
        conversation={convBothAgreed}
        partner={partner}
        contactDetails={contactDetails}
      />
    );

    expect(screen.getByTestId('contact-card')).toBeInTheDocument();
    expect(screen.getByText('rohan@manit.ac.in')).toBeInTheDocument();
    expect(screen.getByText('+919876543210')).toBeInTheDocument();

    const copyEmailBtn = screen.getByLabelText(/copy email/i);
    const copyPhoneBtn = screen.getByLabelText(/copy phone/i);

    fireEvent.click(copyEmailBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('rohan@manit.ac.in');
    expect(await screen.findByText('Copied!')).toBeInTheDocument();

    fireEvent.click(copyPhoneBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('+919876543210');
  });

  it('hides contact card when both_shared is false', () => {
    const convTurnedOff = {
      ...baseConversation,
      my_share: false,
      other_shared: true,
      both_shared: false,
    };

    render(
      <ChatContactSharingBar
        conversation={convTurnedOff}
        partner={partner}
        contactDetails={null}
      />
    );

    expect(screen.queryByTestId('contact-card')).not.toBeInTheDocument();
  });

  it('shows "We became roommates" button and handles confirmation dialog', async () => {
    const mockConfirm = vi.fn();

    render(
      <ChatContactSharingBar
        conversation={baseConversation}
        partner={partner}
        onConfirmRoommates={mockConfirm}
      />
    );

    const roommateBtn = screen.getByRole('button', { name: /we became roommates/i });
    expect(roommateBtn).toBeInTheDocument();

    // Click opens confirmation modal
    fireEvent.click(roommateBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/confirm roommate agreement/i)).toBeInTheDocument();
    expect(screen.getByText(/did you and/i)).toBeInTheDocument();

    // Confirm in dialog
    const confirmBtn = screen.getByRole('button', { name: /yes, we became roommates/i });
    fireEvent.click(confirmBtn);

    expect(mockConfirm).toHaveBeenCalled();
  });

  it('shows waiting state when current user confirmed but partner has not', () => {
    const convMeConfirmed = {
      ...baseConversation,
      me_confirmed: true,
      other_confirmed: false,
      both_confirmed: false,
      roommate_status: 'pending',
    };

    render(
      <ChatContactSharingBar
        conversation={convMeConfirmed}
        partner={partner}
      />
    );

    expect(screen.getByText(/waiting for rohan verma to confirm/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /we became roommates/i })).not.toBeInTheDocument();
  });

  it('shows congratulations banner when both users have confirmed becoming roommates', () => {
    const convBothConfirmed = {
      ...baseConversation,
      me_confirmed: true,
      other_confirmed: true,
      both_confirmed: true,
      roommate_status: 'confirmed',
    };

    render(
      <ChatContactSharingBar
        conversation={convBothConfirmed}
        partner={partner}
      />
    );

    expect(screen.getByTestId('congratulations-banner')).toBeInTheDocument();
    expect(
      screen.getByText(/congratulations! you and rohan verma became roommates!/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Confirmed Roommates')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /we became roommates/i })).not.toBeInTheDocument();
  });

  it('allows user to open phone modal and save phone number', async () => {
    chatService.updatePhone.mockResolvedValueOnce({ success: true });

    render(
      <ChatContactSharingBar
        conversation={baseConversation}
        partner={partner}
      />
    );

    const phoneLink = screen.getByLabelText(/manage phone number/i);
    fireEvent.click(phoneLink);

    expect(screen.getByText(/add optional phone number/i)).toBeInTheDocument();

    const phoneInput = screen.getByPlaceholderText('+91 98765 43210');
    fireEvent.change(phoneInput, { target: { value: '+919876543210' } });

    const saveBtn = screen.getByRole('button', { name: /save phone/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(chatService.updatePhone).toHaveBeenCalledWith('+919876543210');
    });
  });
});
