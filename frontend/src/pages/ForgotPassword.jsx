import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { CheckCircle2, MailCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from '../components/auth/AuthLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const forgotSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(forgotSchema) });

  const onSubmit = async (data) => {
    try {
      const { default: api } = await import('../services/api');
      await api.post('/auth/forgot-password', { email: data.email });
      setSent(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <AuthLayout title={sent ? 'Check your inbox' : 'Reset your password'} subtitle={sent ? undefined : 'We\u2019ll email you a secure link to set a new one.'}>
      {sent ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card card-pad text-center py-12"
        >
          <span className="flex items-center justify-center w-14 h-14 rounded-3xl bg-success/12 border border-success/25 mx-auto">
            <CheckCircle2 className="w-7 h-7 text-success" />
          </span>
          <h2 className="mt-5 text-[20px] font-semibold text-white">Reset link sent</h2>
          <p className="mt-2 text-[14px] text-surface-500 leading-relaxed max-w-xs mx-auto">
            We've emailed a secure password reset link to your address. It expires in 30 minutes.
          </p>
          <Link to="/login" className="mt-7 inline-block">
            <Button variant="secondary" size="md">Back to sign in</Button>
          </Link>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <Input
              label="Email"
              icon={MailCheck}
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
          </div>
          <Button type="submit" loading={isSubmitting} className="w-full">
            {isSubmitting ? 'Sending' : 'Send reset link'}
          </Button>
          <p className="text-center text-[13px] text-surface-500">
            Remember your password?{' '}
            <Link to="/login" className="font-medium text-primary-500 hover:text-primary-hover transition-colors">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
