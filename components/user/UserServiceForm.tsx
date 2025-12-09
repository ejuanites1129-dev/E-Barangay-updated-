'use client'

import { useState, useEffect } from "react";
import { useForm } from 'react-hook-form';
import { getItemById } from "@/lib/api/items";
import { createRequest } from "@/lib/api/requests";
import { ItemWithCategory } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Eye, Loader2 } from 'lucide-react';

interface ServiceFormProps {
  service: string | null; 
  onNavigate: (view: 'dashboard' | 'services' | 'facilities' | 'application' | 'requests') => void;
}

export function ServiceForm({ service, onNavigate }: ServiceFormProps) {
  const [item, setItem] = useState<ItemWithCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [previewData, setPreviewData] = useState<any>({});

  // Parse requirements from item
  const bookingRules = item ? ((item as any).bookingRules || (item as any).booking_rules) : null;
  const requirements = bookingRules
    ? bookingRules.split(',').map((r: string) => r.trim()).filter(Boolean)
    : ['Name', 'Contact Number', 'Purpose'];

  // Create dynamic form schema
  const defaultValues: any = {};
  requirements.forEach((req: string) => {
    const key = req.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    defaultValues[key] = '';
  });

  const { 
    register, 
    handleSubmit, 
    watch, 
    formState: { errors, touchedFields },
    reset
  } = useForm({
    mode: 'onTouched',
    defaultValues
  });

  const formValues = watch();

  useEffect(() => {
    async function loadItem() {
      if (!service) {
        setLoading(false);
        return;
      }

      try {
        const itemData = await getItemById(service);
        setItem(itemData);
      } catch (error) {
        console.error('Failed to load item:', error);
      } finally {
        setLoading(false);
      }
    }

    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    }

    loadItem();
    loadUser();
  }, [service]);

  const onSubmit = async (data: any) => {
    if (!item || !userId) {
      alert("Please log in to submit a request");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitStatus('idle');
      setErrorMessage('');

      // Convert back to readable format with original requirement names
      const reasonParts: string[] = [];
      requirements.forEach((req: string) => {
        const key = req.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        if (data[key]) {
          reasonParts.push(`${req}: ${data[key]}`);
        }
      });
      const reason = reasonParts.join(', ');
      
      await createRequest(userId, item.id, reason);
      
      setSubmitStatus('success');
      reset();

      // Redirect after 2 seconds
      setTimeout(() => {
        onNavigate('requests');
      }, 2000);
    } catch (error) {
      console.error('Failed to submit request:', error);
      setSubmitStatus('error');
      setErrorMessage('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreview = (data: any) => {
    setPreviewData(data);
    setShowPreview(true);
  };

  const handleBackToEdit = () => {
    setShowPreview(false);
  };

  // Get validation rules - DISABLED FOR TESTING
  const getValidationRules = (fieldName: string) => {
    return {};
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Service not found.</div>
      </div>
    );
  }

  // Preview View
  if (showPreview) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Preview Your Request</CardTitle>
            <CardDescription>Review your information before submitting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-900 mb-1">{item.name}</h3>
              <p className="text-sm text-blue-700">{item.description}</p>
            </div>

            <div className="space-y-3">
              {requirements.map((req: string) => {
                const key = req.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                const value = previewData[key];
                return (
                  <div key={key} className="flex justify-between border-b pb-2">
                    <span className="font-semibold">{req}:</span>
                    <span className="text-gray-700">{value || 'Not provided'}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBackToEdit}
                className="flex-1"
              >
                ← Back to Edit
              </Button>
              <Button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Confirm & Submit'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Form View
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">{item.name} Application</CardTitle>
          {item.description && (
            <CardDescription>{item.description}</CardDescription>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(handlePreview)} className="space-y-4">
            {/* Success/Error Messages */}
            {submitStatus === 'success' && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Request submitted successfully! Redirecting to your requests...
                </AlertDescription>
              </Alert>
            )}

            {submitStatus === 'error' && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Dynamic Form Fields */}
            {requirements.map((req: string, idx: number) => {
              const fieldKey = req.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
              
              const isTextArea = req.toLowerCase().includes('address') || 
                                req.toLowerCase().includes('purpose') ||
                                req.toLowerCase().includes('reason');
              
              return (
                <div key={idx} className="space-y-2">
                  <Label htmlFor={fieldKey}>
                    {req}
                  </Label>
                  {isTextArea ? (
                    <Textarea
                      id={fieldKey}
                      {...register(fieldKey, getValidationRules(req))}
                      placeholder={`Enter ${req}`}
                      rows={3}
                      className={errors[fieldKey] ? 'border-red-500' : ''}
                    />
                  ) : (
                    <Input
                      id={fieldKey}
                      {...register(fieldKey, getValidationRules(req))}
                      placeholder={`Enter ${req}`}
                      className={errors[fieldKey] ? 'border-red-500' : ''}
                    />
                  )}
                  {errors[fieldKey] && touchedFields[fieldKey] && (
                    <p className="text-sm text-red-500">
                      {errors[fieldKey]?.message as string}
                    </p>
                  )}
                </div>
              );
            })}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onNavigate('services')}
                className="flex-1"
                disabled={submitting}
              >
                ← Back
              </Button>

              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Eye className="mr-2 h-4 w-4" />
                Preview Request
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
