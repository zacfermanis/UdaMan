'use client';

import React, { useState, useCallback, useRef } from 'react';
import { ParticipantService } from '@/lib/competition/participant-service';
import { 
  InviteParticipantData, 
  ParticipantRole 
} from '@/types/competition';

interface ParticipantInviteProps {
  competitionId: string;
  onSuccess?: (invitedParticipants: any[]) => void;
  onCancel?: () => void;
  className?: string;
}

interface InvitationData {
  email: string;
  role: ParticipantRole;
}

interface FormData {
  invitations: InvitationData[];
  customMessage: string;
  defaultRole: ParticipantRole;
}

interface FormErrors {
  [key: string]: string;
}

interface EmailValidationResult {
  isValid: boolean;
  error?: string;
}

const ROLE_OPTIONS: { value: ParticipantRole; label: string; description: string }[] = [
  { 
    value: 'participant', 
    label: 'Participant', 
    description: 'Can participate in events and view competition details' 
  },
  { 
    value: 'admin', 
    label: 'Admin', 
    description: 'Can manage events, participants, and competition settings' 
  },
  { 
    value: 'spectator', 
    label: 'Spectator', 
    description: 'Can view competition details but cannot participate' 
  }
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ParticipantInvite({
  competitionId,
  onSuccess,
  onCancel,
  className = ""
}: ParticipantInviteProps) {
  const [formData, setFormData] = useState<FormData>({
    invitations: [{ email: '', role: 'participant' }],
    customMessage: '',
    defaultRole: 'participant'
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  
  const participantService = new ParticipantService();
  const emailInputRef = useRef<HTMLInputElement>(null);

  const validateEmail = useCallback((email: string): EmailValidationResult => {
    if (!email.trim()) {
      return { isValid: false, error: 'Email is required' };
    }
    if (!EMAIL_REGEX.test(email)) {
      return { isValid: false, error: 'Invalid email format' };
    }
    return { isValid: true };
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Validate each invitation
    formData.invitations.forEach((invitation, index) => {
      const emailValidation = validateEmail(invitation.email);
      if (!emailValidation.isValid) {
        newErrors[`email-${index}`] = emailValidation.error!;
      }
    });

    // Check for duplicate emails
    const emails = formData.invitations.map(inv => inv.email.toLowerCase().trim());
    const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index);
    if (duplicateEmails.length > 0) {
      newErrors.duplicates = 'Duplicate email addresses found';
    }

    // Validate custom message length
    if (formData.customMessage.length > 1000) {
      newErrors.customMessage = 'Custom message must be 1000 characters or less';
    }

    // Check if at least one invitation exists
    if (formData.invitations.length === 0 || formData.invitations.every(inv => !inv.email.trim())) {
      newErrors.general = 'At least one email address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, validateEmail]);

  const handleAddInvitation = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      invitations: [...prev.invitations, { email: '', role: prev.defaultRole }]
    }));
  }, []);

  const handleRemoveInvitation = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      invitations: prev.invitations.filter((_, i) => i !== index)
    }));
    
    // Clear error for removed invitation
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`email-${index}`];
      return newErrors;
    });
  }, []);

  const handleInvitationChange = useCallback((index: number, field: keyof InvitationData, value: string | ParticipantRole) => {
    setFormData(prev => ({
      ...prev,
      invitations: prev.invitations.map((invitation, i) => 
        i === index ? { ...invitation, [field]: value } : invitation
      )
    }));

    // Clear error when user starts typing
    if (field === 'email' && errors[`email-${index}`]) {
      setErrors(prev => ({ ...prev, [`email-${index}`]: '' }));
    }
  }, [errors]);

  const handleDefaultRoleChange = useCallback((role: ParticipantRole) => {
    setFormData(prev => ({
      ...prev,
      defaultRole: role,
      invitations: prev.invitations.map(invitation => ({ ...invitation, role }))
    }));
  }, []);

  const handleCustomMessageChange = useCallback((message: string) => {
    setFormData(prev => ({ ...prev, customMessage: message }));
    
    // Clear error when user starts typing
    if (errors.customMessage) {
      setErrors(prev => ({ ...prev, customMessage: '' }));
    }
  }, [errors]);

  const handleEmailInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const email = emailInput.trim();
      if (email) {
        const validation = validateEmail(email);
        if (validation.isValid) {
          setFormData(prev => ({
            ...prev,
            invitations: [...prev.invitations, { email, role: prev.defaultRole }]
          }));
          setEmailInput('');
        }
      }
    }
  }, [emailInput, validateEmail]);

  const handleBulkEmailsChange = useCallback((emails: string) => {
    setBulkEmails(emails);
  }, []);

  const processBulkEmails = useCallback(() => {
    const emailList = bulkEmails
      .split(/[,\n]/)
      .map(email => email.trim())
      .filter(email => email.length > 0);

    const validEmails: InvitationData[] = [];
    const invalidEmails: string[] = [];

    emailList.forEach(email => {
      const validation = validateEmail(email);
      if (validation.isValid) {
        validEmails.push({ email, role: formData.defaultRole });
      } else {
        invalidEmails.push(email);
      }
    });

    if (invalidEmails.length > 0) {
      setErrors(prev => ({ 
        ...prev, 
        bulkEmails: `Invalid emails: ${invalidEmails.join(', ')}` 
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      invitations: [...prev.invitations, ...validEmails]
    }));
    setBulkEmails('');
    setShowBulkInput(false);
    setErrors(prev => ({ ...prev, bulkEmails: '' }));
  }, [bulkEmails, validateEmail, formData.defaultRole]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const invitationData: InviteParticipantData[] = formData.invitations
        .filter(invitation => invitation.email.trim())
        .map(invitation => ({
          email: invitation.email.trim(),
          role: invitation.role
        }));

      const invitedParticipants = await participantService.inviteParticipants(
        competitionId,
        invitationData,
        'dummy-inviter-id' // TODO: Get actual inviter ID from session
      );

      if (onSuccess) {
        onSuccess(invitedParticipants);
      }
    } catch (error) {
      console.error('Failed to send invitations:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to send invitations' });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, participantService, competitionId, onSuccess]);

  const renderInvitationRow = (invitation: InvitationData, index: number) => (
    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <input
          type="email"
          value={invitation.email}
          onChange={(e) => handleInvitationChange(index, 'email', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors[`email-${index}`] ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Enter email address"
        />
        {errors[`email-${index}`] && (
          <p className="mt-1 text-sm text-red-600">{errors[`email-${index}`]}</p>
        )}
      </div>
      
      <div className="w-48">
        <select
          value={invitation.role}
          onChange={(e) => handleInvitationChange(index, 'role', e.target.value as ParticipantRole)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {ROLE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      
      <button
        type="button"
        onClick={() => handleRemoveInvitation(index)}
        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
        disabled={formData.invitations.length === 1}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );

  return (
    <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Invite Participants</h2>
        <p className="text-gray-600">Send invitations to participants to join your competition</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Default Role Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Role for New Invitations
          </label>
          <select
            value={formData.defaultRole}
            onChange={(e) => handleDefaultRoleChange(e.target.value as ParticipantRole)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {ROLE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Add Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick Add Email
          </label>
          <div className="flex space-x-3">
            <input
              ref={emailInputRef}
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={handleEmailInputKeyDown}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter email and press Enter or comma"
            />
            <button
              type="button"
              onClick={() => {
                if (emailInput.trim()) {
                  const validation = validateEmail(emailInput);
                  if (validation.isValid) {
                    setFormData(prev => ({
                      ...prev,
                      invitations: [...prev.invitations, { email: emailInput.trim(), role: prev.defaultRole }]
                    }));
                    setEmailInput('');
                  }
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowBulkInput(!showBulkInput)}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Bulk Add
            </button>
          </div>
        </div>

        {/* Bulk Email Input */}
        {showBulkInput && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bulk Email Input
            </label>
            <textarea
              value={bulkEmails}
              onChange={(e) => handleBulkEmailsChange(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter email addresses separated by commas or new lines"
            />
            {errors.bulkEmails && (
              <p className="mt-1 text-sm text-red-600">{errors.bulkEmails}</p>
            )}
            <div className="mt-3 flex space-x-3">
              <button
                type="button"
                onClick={processBulkEmails}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Process Emails
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBulkInput(false);
                  setBulkEmails('');
                  setErrors(prev => ({ ...prev, bulkEmails: '' }));
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Invitation List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Invitations ({formData.invitations.filter(inv => inv.email.trim()).length})
            </label>
            <button
              type="button"
              onClick={handleAddInvitation}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add Another
            </button>
          </div>
          
          <div className="space-y-3">
            {formData.invitations.map((invitation, index) => 
              renderInvitationRow(invitation, index)
            )}
          </div>
        </div>

        {/* Custom Message */}
        <div>
          <label htmlFor="customMessage" className="block text-sm font-medium text-gray-700 mb-2">
            Custom Invitation Message (Optional)
          </label>
          <textarea
            id="customMessage"
            value={formData.customMessage}
            onChange={(e) => handleCustomMessageChange(e.target.value)}
            rows={4}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.customMessage ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Add a personal message to your invitation..."
            maxLength={1000}
          />
          {errors.customMessage && (
            <p className="mt-1 text-sm text-red-600">{errors.customMessage}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            {formData.customMessage.length}/1000 characters
          </p>
        </div>

        {/* Error Display */}
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{errors.general}</p>
          </div>
        )}

        {errors.duplicates && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-yellow-600">{errors.duplicates}</p>
          </div>
        )}

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          )}
          
          <button
            type="submit"
            disabled={isSubmitting || formData.invitations.every(inv => !inv.email.trim())}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Sending Invitations...' : 'Send Invitations'}
          </button>
        </div>
      </form>
    </div>
  );
}
