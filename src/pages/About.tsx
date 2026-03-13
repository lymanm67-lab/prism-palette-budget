import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate, Link } from 'react-router-dom';
import {
  Zap, Heart, Target, Shield, BarChart3, Bot, Sparkles, ArrowRight, Code2, Lightbulb, Users
} from 'lucide-react';
import designerPhoto from '@/assets/designer-photo.png';

const VALUES = [
  { icon: Heart, title: 'Empathy First', desc: 'Built for real people struggling with real financial challenges — not financial experts.' },
  { icon: Shield, title: 'Privacy by Default', desc: 'Your financial data is yours. Bank-level encryption, no data selling, no tracking.' },
  { icon: Lightbulb, title: 'Education Over Sales', desc: 'Every feature teaches you something. The goal is financial literacy, not subscription lock-in.' },
  { icon: Users, title: 'Community Driven', desc: 'Shaped by feedback from thousands of users who shared their money stories with us.' },
];

const About = () => {
  const navigate = useNavigate();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 max-w-4xl">
      {/* Hero */}
      <div className="relative rounded-3xl overflow-hidden p-8 sm:p-12 auth-gradient-bg">
        <div className="orb w-64 h-64 bg-[hsl(var(--prism-teal))] -top-16 -right-16" style={{ animationDelay: '0s' }} />
        <div className="orb w-48 h-48 bg-[hsl(var(--prism-orange))] bottom-0 -left-12" style={{ animationDelay: '-5s' }} />

        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl prism-gradient prism-glow">
            <Zap className="h-12 w-12 text-white" />
          </div>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              The Story Behind <span className="prism-gradient-text">PrismBudget™</span>
            </h1>
            <p className="mt-3 text-white/80 leading-relaxed max-w-xl">
              Built by someone who lived the financial struggle — and decided to build the tool they wished existed.
            </p>
          </div>
        </div>
      </div>

      {/* Meet the Designer */}
      <div className="rounded-2xl border border-border p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Designer photo */}
          <img
            src={designerPhoto}
            alt="The designer and creator of PrismBudget"
            className="h-28 w-28 shrink-0 rounded-2xl object-cover object-top border-2 border-prism-teal/30 shadow-lg"
          />
          <div className="text-center sm:text-left space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-prism-teal">Meet the Designer</p>
            <h2 className="font-display text-2xl font-bold">The Creator of PrismBudget™</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
              Designer, developer, and someone who understands what it's like to stare at a bank account
              and feel lost. PrismBudget™ was born out of a personal mission to make financial clarity
              accessible to everyone — not just those who can afford a financial advisor.
            </p>
            <p className="text-xs text-muted-foreground/60 italic">
              Designer · Developer · Financial Advocate
            </p>
          </div>
        </div>
      </div>

      {/* Origin Story */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <h2 className="font-display text-2xl font-bold">Why I Built This</h2>
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              A few years ago, I was drowning. Credit card debt, student loans, a car payment I couldn't really afford, and 
              a budgeting spreadsheet that was more stressful than helpful. I tried every app out there — they were either 
              too simple (glorified transaction lists), too complex (meant for CPAs), or too expensive for someone 
              already struggling to make ends meet.
            </p>
            <p>
              I wanted something that would meet me where I was. Something that would tell me, step by step, 
              what to do <em>next</em> with my money. Not just track where it went, but guide me toward where it 
              <em> should</em> go. That's when the idea for PrismBudget™ was born.
            </p>
            <p>
              The name "Prism" represents clarity — taking the chaotic white noise of personal finance and 
              splitting it into a clear, colorful spectrum of actionable layers. Every feature in this app exists 
              because I needed it at some point on my own journey: the debt payoff planner that kept me motivated 
              when I was $30K in the hole, the{' '}
              <Link to="/roadmap" className="text-prism-teal hover:underline font-medium">
                Prism Financial Roadmap
              </Link>{' '}
              that gave me a clear sequence of wealth-building steps, and the AI assistant that answered the 
              tax questions I was too embarrassed to ask anyone.
            </p>
            <p>
              Today, PrismBudget is used by thousands of people to take control of their finances. Some are 
              where I was — paycheck to paycheck, terrified to open their credit card statements. Others are 
              further along, building wealth and crushing it. The app serves them all because it was built from 
              lived experience, not a boardroom.
            </p>
            <p className="font-medium text-foreground">
              If you're reading this, you're already ahead. You're taking action. And PrismBudget is here 
              to make sure every dollar you earn works as hard as you do.
            </p>
          </div>
        </div>

        {/* Stats / quick facts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border p-6 space-y-5">
            <h3 className="font-display font-bold text-lg flex items-center gap-2">
              <Code2 className="h-5 w-5 text-prism-teal" /> Built With
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Zero-Based Budgeting', icon: Target },
                { label: 'AI-Powered Insights', icon: Bot },
                { label: 'Financial Roadmap', icon: BarChart3 },
                { label: 'Real User Feedback', icon: Users },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <item.icon className="h-4 w-4 text-prism-teal shrink-0" />
                  <span className="text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border p-6 space-y-4">
            <h3 className="font-display font-bold text-lg">The Mission</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Make financial literacy accessible to everyone — regardless of income, background, or 
              financial education. No jargon, no judgment, just a clear path forward.
            </p>
            <div className="h-1 rounded-full bg-gradient-to-r from-prism-navy via-prism-teal to-prism-orange" />
          </div>

          <div className="rounded-2xl prism-gradient p-6 text-white">
            <Sparkles className="h-6 w-6 mb-3" />
            <p className="font-display font-bold text-lg">Join the Movement</p>
            <p className="text-sm text-white/60 mt-1 mb-4">
              Every dollar you budget is a step toward freedom.
            </p>
            <Button
              onClick={() => navigate('/dashboard')}
              variant="secondary"
              className="gap-2 bg-white/20 hover:bg-white/30 text-white border-0"
            >
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Values */}
      <div>
        <h2 className="font-display text-2xl font-bold mb-6">Our Values</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {VALUES.map((v, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-border p-5 hover:border-primary/30 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-prism-teal to-prism-sky group-hover:scale-110 transition-transform">
                  <v.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-display font-bold">{v.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{v.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default About;
