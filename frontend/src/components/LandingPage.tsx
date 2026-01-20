import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Calendar,
  MapPin,
  Users,
  Zap,
  CheckCircle,
  ArrowRight,
  Star,
  Clock,
  Link as LinkIcon,
  Shield,
} from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="bg-background">
      {/* Hero Section - The Problem Statement */}
      <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Waste less time doing admin.
            <br />
            <span className="text-primary">Invest more time actually building your business.</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            You started a popup to share your passion, not to spend hours updating
            Instagram, managing DMs, and hoping customers find you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/signup?role=business')} className="text-lg px-8">
              List Your Popup Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/brands')}>
              See Who's On PopMap
            </Button>
          </div>
        </div>
      </section>

      {/* Problem Section - Empathy */}
      <section className="py-16 px-4 border-t">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Sound Familiar?
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="pt-6">
                <div className="text-destructive mb-4 pt-2">
                  <Clock className="h-8 w-8" />
                </div>
                <h4 className="font-semibold mb-2">Hours Lost to Admin</h4>
                <p className="text-sm text-muted-foreground">
                  Updating your bio link, posting to stories, answering the same
                  "where are you this weekend?" DMs over and over.
                </p>
              </CardContent>
            </Card>
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="pt-6">
                <div className="text-destructive mb-4 pt-2">
                  <Users className="h-8 w-8" />
                </div>
                <h4 className="font-semibold mb-2">Customers Can't Find You</h4>
                <p className="text-sm text-muted-foreground">
                  Your schedule is buried in your Instagram highlights. New customers
                  don't know you exist. Regulars miss your events.
                </p>
              </CardContent>
            </Card>
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="pt-6">
                <div className="text-destructive mb-4 pt-2">
                  <Star className="h-8 w-8" />
                </div>
                <h4 className="font-semibold mb-2">Yelp's Review Roulette</h4>
                <p className="text-sm text-muted-foreground">
                  One bad review from someone who showed up 5 minutes before close
                  tanks your rating. Your regulars never leave reviews.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Guide Section - Authority + Empathy */}
      <section className="py-16 px-4 bg-primary/5">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-primary font-medium mb-4">We Get It</p>
          <h3 className="text-2xl md:text-3xl font-bold mb-6">
            Built by Popup Lovers, for Popup Owners
          </h3>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We've been to hundreds of popups and farmers markets. We've seen
            incredible business owners struggle to be discovered while chain restaurants
            dominate the algorithms. PopMap exists to change that.
          </p>
        </div>
      </section>

      {/* Solution Section - The Plan */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-4">
            Three Steps to More Customers, Less Stress
          </h3>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            No complicated setup. No tech skills needed. Just your popup, on the map.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h4 className="font-semibold text-lg mb-2">Create Your Profile</h4>
              <p className="text-sm text-muted-foreground">
                Add your logo, bio, and social links. Takes 5 minutes.
                Think Linktree, but built for events.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h4 className="font-semibold text-lg mb-2">Post Your Events</h4>
              <p className="text-sm text-muted-foreground">
                Add your popup dates, locations, and times. They show up on the
                map automatically and go away after it's over. Update once, done - no confusion because of stale info.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h4 className="font-semibold text-lg mb-2">Get Discovered</h4>
              <p className="text-sm text-muted-foreground">
                Customers find you by browsing the map. They RSVP, get reminders,
                and show up. You focus on what you love.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Benefits */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Everything You Need On One Platform
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Map-First Discovery</h4>
                <p className="text-sm text-muted-foreground">
                  Customers browse by location. No algorithms deciding if they see
                  your post. If you're nearby, they find you.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <LinkIcon className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Your Event Hub</h4>
                <p className="text-sm text-muted-foreground">
                  One link for your bio. Shows your upcoming events, past popups,
                  social links, and booking info. Like Linktree, but useful.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-1">No Public Reviews</h4>
                <p className="text-sm text-muted-foreground">
                  Get the discovery benefits of Yelp without strangers tanking your
                  reputation. Your customers vote with RSVPs, not grudges.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-1">RSVP & Reminders</h4>
                <p className="text-sm text-muted-foreground">
                  Customers mark "interested" or "going." They get reminded before
                  your event. No more "I forgot you were there!"
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Quick Event Posting</h4>
                <p className="text-sm text-muted-foreground">
                  Post a new event in under 60 seconds. Recurring events? Set it
                  once. No more weekly Instagram story grind.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-1">See Who's Coming</h4>
                <p className="text-sm text-muted-foreground">
                  Know how many people plan to show up. Prep the right amount of
                  product. No more guessing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Success Section - What Life Looks Like */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Imagine This Instead
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  New customers discovering you every week because you're
                  literally on their map
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  One link in your bio that actually shows where you'll be,
                  not a dead Linktree
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  Knowing 50 people RSVP'd so you prep enough inventory
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  Customers who get reminded the day before and actually show up
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  Spending Sunday prepping product instead of posting content
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  Building your reputation through attendance, not review scores
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 px-4 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-2xl md:text-4xl font-bold mb-6">
            Your Popup Deserves to Be Found
          </h3>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
            Join the popup vendors who've stopped fighting the algorithm and
            started connecting with customers who are actually looking for them.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate('/signup?role=business')}
              className="text-lg px-8"
            >
              List Your Popup Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
          <p className="text-sm opacity-75 mt-4">
            Free forever for up to 3 events/month. No credit card required.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>PopMap - Discover local popup events wherever you are</p>
          <div className="flex gap-6">
            <a href="/brands" className="hover:text-foreground transition-colors">
              Browse Vendors
            </a>
            <a href="/signup?role=business" className="hover:text-foreground transition-colors">
              List Your Popup
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
