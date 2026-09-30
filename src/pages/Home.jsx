import React from 'react';
import { motion } from "framer-motion";
import { Link } from 'react-router-dom';
import { MapPin, Shield, Zap, Layout } from 'lucide-react';
import { useTranslation } from '../config/useTranslation';

export default function Home() {
  const { t } = useTranslation();

  const listVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { staggerChildren: 0.12 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-86px)]">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative px-6 pt-14 lg:px-8 bg-white border-b border-gray-200">
        <div className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#FF9933] to-[#138808] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
        </div>

        <div className="mx-auto max-w-3xl py-20 sm:py-24 lg:py-28 text-center">
          <div className="hidden sm:mb-8 sm:flex sm:justify-center">
            <div className="relative rounded-full px-4 py-1 text-xs font-bold leading-6 text-[#FF9933] ring-1 ring-gray-900/10 hover:ring-gray-900/20 uppercase tracking-widest bg-orange-50">
              {t('officialCivicPortal', 'Official Civic Action Portal')}
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[#1e3a8a] sm:text-6xl font-serif">
            {t('understandYourCity', 'Understand Your City with')} <span className="text-[#FF9933]">UrbanEye</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto font-medium">
            {t('homeSubText', 'A comprehensive platform for reporting, analyzing, and resolving urban issues. Join the community to make your city better, cleaner, and safer.')}
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <motion.a
                as={Link}
                href="/register.jsx"
                to="/register.jsx"
                className="rounded-lg bg-[#1e3a8a] px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-blue-900 transition-all"
                transition={{ type: 'spring', stiffness: 300 }}>
                {t('accessPortal', 'Access Portal')}
              </motion.a>
            </motion.div>
            <motion.div whileHover={{ y: -2 }}>
              <motion.a
                as={Link}
                href="/login.jsx"
                to="/login.jsx"
                className="text-sm font-bold leading-6 text-gray-900 hover:text-[#1e3a8a] transition-colors"
                transition={{ type: 'spring', stiffness: 300 }}>
                {t('citizenLogin', 'Citizen Login')} <span aria-hidden="true">→</span>
              </motion.a>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="py-24 sm:py-32 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-base font-bold uppercase tracking-widest leading-7 text-[#138808]">{t('infrastructureSecurity', 'Infrastructure Security')}</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-[#1e3a8a] sm:text-4xl font-serif">
              {t('everythingToReport', 'Everything you need to report issues')}
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <motion.div variants={listVariants} initial="hidden" animate="show">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
                <motion.div
                  variants={itemVariants}
                  className="relative pl-16 bg-white p-8 pl-28 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                  whileHover={{ scale: 1.02 }}>
                  <dt className="text-base font-bold leading-7 text-gray-900 font-serif text-lg">
                    <div className="absolute left-8 top-8 flex h-12 w-12 items-center justify-center rounded-lg bg-[#1e3a8a] shadow-sm">
                      <Shield className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    {t('secureBackend', 'Secure Backend')}
                  </dt>
                  <dd className="mt-2 text-sm leading-7 text-gray-600 font-medium">
                    {t('secureBackendDesc', 'Your data is protected. We use enterprise-grade Firebase Auth integrated with a powerful Spring Boot architecture.')}
                  </dd>
                </motion.div>
                <motion.div
                  variants={itemVariants}
                  className="relative pl-16 bg-white p-8 pl-28 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                  whileHover={{ scale: 1.02 }} >
                  <dt className="text-base font-bold leading-7 text-gray-900 font-serif text-lg">
                    <div className="absolute left-8 top-8 flex h-12 w-12 items-center justify-center rounded-lg bg-[#FF9933] shadow-sm">
                      <Zap className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    {t('lightningFast', 'Lightning Fast')}
                  </dt>
                  <dd className="mt-2 text-sm leading-7 text-gray-600 font-medium">
                    {t('lightningFastDesc', 'Built with Vite and React for snappy response times and instant feedback across all national districts.')}
                  </dd>
                </motion.div>
              </dl>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
