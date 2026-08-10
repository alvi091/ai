import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/auth/AuthLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(signupSchema) });

  const onSubmit = async (data) => {
    try {
      await signup(data.email, data.password, data.name);
      toast.success('Account created');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Sign up failed. Please try again.');
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Your AI buying agent, ready in seconds.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <Input
            label="Full name"
            type="text"
            placeholder="Jordan Lee"
            error={errors.name?.message}
            {...register('name')}
          />
        </div>

        <div>
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        <div>
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              error={errors.password?.message}
              hint={!errors.password ? 'Used to secure your account. We never share it.' : undefined}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-[42px] text-surface-500 hover:text-surface-300 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full">
          {isSubmitting ? 'Creating account' : 'Create account'}
          {!isSubmitting && <ArrowRight className="w-4 h-4" />}
        </Button>

        <p className="text-center text-[12px] text-surface-500 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary-500" />
          Free forever while in beta.
        </p>
      </form>

      <p className="mt-7 text-center text-[13px] text-surface-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary-500 hover:text-primary-hover transition-colors">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
