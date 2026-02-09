import { BookOpen, Mic, Users, Heart } from "lucide-react";
import { Link } from "react-router-dom";

export default function About() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="py-20 bg-gradient-section">
        <div className="container mx-auto px-4 text-center">
          <p className="text-primary text-sm tracking-[0.2em] uppercase mb-3">About</p>
          <h1 className="font-display text-5xl md:text-6xl font-bold mb-4">Bryant Clark</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Author, Speaker, Pastor — Founder of The Island of One Ministries
          </p>
        </div>
      </section>

      {/* Bio */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="space-y-6 text-secondary-foreground leading-relaxed text-lg">
            <p>
              Bryant Clark is a man called to the margins — to the places where faith is tested, 
              leadership is forged, and purpose is discovered in solitude. As the founder of 
              <span className="text-primary font-semibold"> The Island of One Ministries</span>, 
              he carries a message for those who feel alone in their calling.
            </p>
            <p>
              With a background in pastoral ministry and a passion for the written word, Bryant 
              has authored multiple books that challenge believers to stand firm, lead boldly, and 
              trust God even when the crowd walks away.
            </p>
            <p>
              His speaking engagements span churches, conferences, and leadership summits across 
              the nation, delivering messages that are both theologically grounded and deeply 
              personal. Bryant believes that some of God's greatest work happens on the island — 
              in the quiet, in the waiting, in the standing alone.
            </p>
          </div>
        </div>
      </section>

      {/* Ministry Pillars */}
      <section className="py-20 bg-gradient-section">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-16">Ministry Pillars</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              { icon: BookOpen, title: "Writing", desc: "Books and devotionals that equip believers for their journey." },
              { icon: Mic, title: "Speaking", desc: "Messages that ignite faith and empower leadership." },
              { icon: Users, title: "Pastoring", desc: "Walking alongside believers through every season." },
              { icon: Heart, title: "Community", desc: "Building a tribe of purpose-driven believers." },
            ].map((pillar) => (
              <div key={pillar.title} className="text-center p-6 rounded-xl bg-card border border-border">
                <pillar.icon className="h-8 w-8 text-primary mx-auto mb-4" />
                <h3 className="font-display text-lg font-semibold mb-2">{pillar.title}</h3>
                <p className="text-sm text-muted-foreground">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl font-bold mb-6">Let's Connect</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Whether you want to book a speaking engagement, join the community, or explore the ministry — the door is always open.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/speaking" className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-gold">
              Book to Speak
            </Link>
            <Link to="/membership" className="px-8 py-3 rounded-full border border-primary/30 text-foreground font-semibold text-sm hover:bg-primary/10 transition-colors">
              Join the Community
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
