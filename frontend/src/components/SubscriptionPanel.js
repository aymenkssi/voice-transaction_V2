import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import axios from 'axios';
import { toast } from 'sonner';
import { Crown, Check, Loader2, X, Clock, Tag } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SubscriptionPanel = ({ onStatusChange }) => {
  const { getAuthHeader } = useAuth();
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showPayPal, setShowPayPal] = useState(false);
  const [planType, setPlanType] = useState('monthly');
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const fetchStatus = async () => {
    try {
      const [statusRes, settingsRes] = await Promise.all([
        axios.get(`${API}/subscription/status`, { headers: getAuthHeader() }),
        axios.get(`${API}/settings/public`),
      ]);
      setStatus(statusRes.data);
      setSettings(settingsRes.data);
    } catch (err) {
      console.error('Error fetching subscription status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, [getAuthHeader]);

  const handleActivate = async (subscriptionId) => {
    try {
      await axios.post(`${API}/subscription/activate`, { subscription_id: subscriptionId }, { headers: getAuthHeader() });
      toast.success(t('subscription.activated'));
      setShowPayPal(false);
      setCouponResult(null);
      fetchStatus();
      onStatusChange?.();
    } catch (err) {
      toast.error(t('subscription.activationFailed'));
    }
  };

  const handleCancel = async () => {
    if (!window.confirm(t('subscription.cancelConfirm'))) return;
    setCancelling(true);
    try {
      await axios.post(`${API}/subscription/cancel`, {}, { headers: getAuthHeader() });
      toast.success(t('subscription.cancelled'));
      fetchStatus();
      onStatusChange?.();
    } catch (err) {
      toast.error('Error');
    } finally {
      setCancelling(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    try {
      const res = await axios.post(`${API}/coupons/apply`, {
        code: couponCode.trim(),
        plan_type: planType
      }, { headers: getAuthHeader() });

      if (res.data.free_subscription) {
        toast.success(t('subscriptionYearly.freeAccess'));
        setCouponResult(null);
        setCouponCode('');
        fetchStatus();
        onStatusChange?.();
      } else {
        setCouponResult(res.data);
        toast.success(t('subscriptionYearly.couponApplied'));
      }
    } catch (err) {
      const detail = err.response?.data?.detail || '';
      if (detail.includes('expired')) toast.error(t('subscriptionYearly.couponExpired'));
      else if (detail.includes('already') || detail.includes('Already')) toast.error(t('subscriptionYearly.couponUsed'));
      else if (detail.includes('fully')) toast.error(t('subscriptionYearly.couponFull'));
      else toast.error(t('subscriptionYearly.couponInvalid'));
      setCouponResult(null);
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setCouponResult(null);
    setCouponCode('');
  };

  if (loading) return null;
  if (!settings?.subscription_enabled) return null;

  const usagePct = status?.free_limit_seconds > 0 ? Math.min(100, Math.round((status.usage_seconds / status.free_limit_seconds) * 100)) : 0;
  const limitReached = !status?.is_subscribed && status?.remaining_seconds <= 0;

  const monthlyPrice = settings?.monthly_price || 9.99;
  const yearlyPrice = settings?.yearly_price || 99.90;
  const currency = settings?.currency || 'USD';
  const yearlyEnabled = settings?.yearly_enabled;
  const yearlySavings = Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100);

  const currentPrice = planType === 'yearly' ? yearlyPrice : monthlyPrice;
  const displayPrice = couponResult ? couponResult.final_price : currentPrice;
  const currentPlanId = planType === 'yearly' ? settings?.paypal_yearly_plan_id : settings?.paypal_plan_id;

  const formatSeconds = (s) => {
    if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
    if (s >= 60) return `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`;
    return `${Math.floor(s)}s`;
  };

  return (
    <div className="border border-stele-secondary bg-white mb-8" data-testid="subscription-panel">
      <div className="px-8 py-5 border-b border-stele-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-stele-accent" strokeWidth={1.5} />
          <span className="font-mono text-xs tracking-[0.15em] uppercase text-stele-accent">{t('subscription.title')}</span>
        </div>
        {status?.is_subscribed && (
          <span className="font-mono text-[10px] tracking-wider bg-stele-success text-white px-3 py-1" data-testid="subscribed-badge">PRO</span>
        )}
      </div>
      <div className="p-8">
        {status?.is_subscribed ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Check className="w-4 h-4 text-stele-success" strokeWidth={1.5} />
              <p className="font-inter text-sm font-medium text-stele-success">{t('subscription.subscribedMsg')}</p>
            </div>
            <p className="font-inter text-sm text-stele-muted mb-1">
              <Crown className="w-3.5 h-3.5 inline mr-1" strokeWidth={1.5} /> {t('subscription.unlimited')}
            </p>
            {status?.subscription?.expires_at && (
              <p className="font-mono text-xs text-stele-accent mb-4">
                {t('subscription.expiresAt')}: {new Date(status.subscription.expires_at).toLocaleDateString(t('lang') === 'fr' ? 'fr-FR' : 'en-US')}
              </p>
            )}
            <button onClick={handleCancel} disabled={cancelling} className="btn-stele-outline text-[10px] px-4 py-2" data-testid="cancel-subscription-btn">
              {cancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : t('subscription.cancel')}
            </button>
          </div>
        ) : (
          <div>
            {/* Usage Progress */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="font-inter text-xs text-stele-muted">{t('subscription.freeUsage')}</span>
                <span className="font-mono text-xs text-stele-accent">
                  {formatSeconds(status?.usage_seconds || 0)} {t('subscription.of')} {formatSeconds(status?.free_limit_seconds || 0)}
                </span>
              </div>
              <div className="w-full h-1.5 bg-stele-secondary">
                <div className={`h-full transition-all duration-500 ${limitReached ? 'bg-stele-error' : 'bg-stele-primary'}`} style={{ width: `${usagePct}%` }}></div>
              </div>
              {!limitReached && status?.remaining_seconds > 0 && (
                <p className="font-mono text-[10px] text-stele-accent mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" strokeWidth={1.5} />
                  {t('subscription.remainingTime')}: {formatSeconds(status.remaining_seconds)}
                </p>
              )}
            </div>

            {limitReached && (
              <div className="bg-stele-error/5 border border-stele-error/20 p-4 mb-6">
                <p className="font-inter text-sm font-medium text-stele-error mb-1">{t('subscription.limitReached')}</p>
                <p className="font-inter text-xs text-stele-muted">{t('subscription.limitReachedMsg')}</p>
              </div>
            )}

            {/* Pro Offer */}
            <div className="border border-stele-secondary p-6 mb-6">
              <h3 className="font-manrope font-semibold text-stele-primary mb-3">{t('subscription.proTitle')}</h3>

              {/* Plan Toggle */}
              {yearlyEnabled && (
                <div className="flex gap-0 mb-5 border border-stele-secondary" data-testid="plan-toggle">
                  <button
                    onClick={() => { setPlanType('monthly'); setCouponResult(null); }}
                    data-testid="plan-monthly-btn"
                    className={`flex-1 py-2.5 font-mono text-xs tracking-wider transition-colors ${
                      planType === 'monthly' ? 'bg-stele-primary text-white' : 'bg-white text-stele-muted hover:text-stele-primary'
                    }`}
                  >
                    {t('subscriptionYearly.monthly')}
                  </button>
                  <button
                    onClick={() => { setPlanType('yearly'); setCouponResult(null); }}
                    data-testid="plan-yearly-btn"
                    className={`flex-1 py-2.5 font-mono text-xs tracking-wider transition-colors relative ${
                      planType === 'yearly' ? 'bg-stele-primary text-white' : 'bg-white text-stele-muted hover:text-stele-primary'
                    }`}
                  >
                    {t('subscriptionYearly.yearly')}
                    {yearlySavings > 0 && (
                      <span className="ml-1.5 font-mono text-[9px] bg-stele-success text-white px-1.5 py-0.5 align-middle">
                        -{yearlySavings}%
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* Price Display */}
              <div className="mb-4">
                {couponResult ? (
                  <div>
                    <p className="font-mono text-sm text-stele-muted line-through" data-testid="original-price">
                      {couponResult.original_price} {currency}
                    </p>
                    <p className="font-mono text-2xl text-stele-primary" data-testid="discounted-price">
                      {couponResult.final_price} {currency}
                      <span className="text-sm text-stele-muted">{planType === 'yearly' ? t('subscriptionYearly.perYear') : t('subscription.perMonth')}</span>
                    </p>
                    <p className="font-mono text-xs text-stele-success mt-1">-{couponResult.discount_percent}% {t('subscriptionYearly.couponApplied')}</p>
                  </div>
                ) : (
                  <p className="font-mono text-2xl text-stele-primary" data-testid="current-price">
                    {currentPrice} {currency}
                    <span className="text-sm text-stele-muted">{planType === 'yearly' ? t('subscriptionYearly.perYear') : t('subscription.perMonth')}</span>
                  </p>
                )}
              </div>

              <ul className="space-y-2 mb-5">
                {(t('subscription.features') || []).map((f, i) => (
                  <li key={i} className="flex items-center gap-2 font-inter text-xs text-stele-muted">
                    <Check className="w-3 h-3 text-stele-success" strokeWidth={2} />{f}
                  </li>
                ))}
              </ul>

              {/* Coupon Code Input */}
              <div className="mb-5">
                <label className="font-inter text-[10px] tracking-[0.15em] uppercase text-stele-accent block mb-2">
                  <Tag className="w-3 h-3 inline mr-1" strokeWidth={1.5} />
                  {t('subscriptionYearly.couponLabel')}
                </label>
                {couponResult ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-stele-success bg-stele-success/10 px-3 py-1.5">{couponCode.toUpperCase()}</span>
                    <button onClick={removeCoupon} className="font-inter text-xs text-stele-muted hover:text-stele-error" data-testid="remove-coupon-btn">
                      {t('subscriptionYearly.removeCoupon')}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder={t('subscriptionYearly.couponPlaceholder')}
                      className="input-stele flex-1 text-sm"
                      data-testid="coupon-input"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={applyingCoupon || !couponCode.trim()}
                      className="btn-stele-outline text-[10px] px-4 py-2"
                      data-testid="apply-coupon-btn"
                    >
                      {applyingCoupon ? <Loader2 className="w-3 h-3 animate-spin" /> : t('subscriptionYearly.applyCoupon')}
                    </button>
                  </div>
                )}
              </div>

              {!showPayPal ? (
                <button onClick={() => setShowPayPal(true)} className="btn-stele w-full text-xs" data-testid="subscribe-btn">
                  {t('subscription.subscribePro')}
                </button>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-mono text-xs text-stele-accent">PayPal</span>
                    <button onClick={() => setShowPayPal(false)} className="text-stele-muted hover:text-stele-primary">
                      <X className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                  {settings?.paypal_client_id && currentPlanId ? (
                    <PayPalScriptProvider options={{
                      "client-id": settings.paypal_client_id,
                      vault: true,
                      intent: "subscription"
                    }}>
                      <PayPalButtons
                        key={`${planType}-${couponResult?.final_price || 'none'}`}
                        style={{ shape: "rect", color: "black", layout: "vertical", label: "subscribe" }}
                        createSubscription={(data, actions) => {
                          return actions.subscription.create({ plan_id: currentPlanId });
                        }}
                        onApprove={(data) => {
                          handleActivate(data.subscriptionID);
                        }}
                        onError={(err) => {
                          console.error("PayPal error:", err);
                          toast.error(t('subscription.activationFailed'));
                        }}
                      />
                    </PayPalScriptProvider>
                  ) : (
                    <p className="font-inter text-xs text-stele-muted text-center py-4">
                      PayPal plan not configured by admin.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPanel;
