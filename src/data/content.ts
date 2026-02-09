export interface BookChapter {
  id: string;
  title: string;
  content: string;
}

export interface Book {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  description: string;
  price: number;
  isFree: boolean;
  category: string;
  coverImage: string;
  chapters: BookChapter[];
  featured: boolean;
  audioUrl?: string;
}

export const books: Book[] = [
  {
    id: "1",
    title: "Finding Your Island",
    subtitle: "A Journey to Purpose in Isolation",
    author: "Bryant Clark",
    description: "Discover how God uses seasons of solitude to shape your destiny. This powerful guide walks you through the wilderness to find your promised land.",
    price: 14.99,
    isFree: false,
    category: "Devotional",
    coverImage: "book-cover-1",
    chapters: [
      { id: "1-1", title: "The Call to Solitude", content: "Every great leader in scripture experienced a season of isolation..." },
      { id: "1-2", title: "Finding Purpose in the Desert", content: "The desert is not a punishment — it's a classroom..." },
      { id: "1-3", title: "Your Promised Land Awaits", content: "After the wilderness comes the promise..." },
    ],
    featured: true,
  },
  {
    id: "2",
    title: "Standing Alone",
    subtitle: "Faith When the World Walks Away",
    author: "Bryant Clark",
    description: "When everyone else leaves, God remains. Learn to stand firm in faith even when you're the only one standing.",
    price: 12.99,
    isFree: false,
    category: "Faith",
    coverImage: "book-cover-2",
    chapters: [
      { id: "2-1", title: "When the Crowd Leaves", content: "There comes a moment in every believer's life when the crowd thins..." },
      { id: "2-2", title: "The Strength of One", content: "One person with God is always a majority..." },
    ],
    featured: false,
  },
  {
    id: "3",
    title: "The Shepherd's Voice",
    subtitle: "Leading with Grace and Authority",
    author: "Bryant Clark",
    description: "A leadership manual for pastors and ministry leaders who want to lead with both strength and compassion.",
    price: 0,
    isFree: true,
    category: "Leadership",
    coverImage: "book-cover-3",
    chapters: [
      { id: "3-1", title: "The Heart of a Shepherd", content: "Leadership begins with the heart, not the title..." },
      { id: "3-2", title: "Leading with Grace", content: "Grace is not weakness — it's strength under control..." },
      { id: "3-3", title: "Authority and Humility", content: "True authority flows from humility..." },
      { id: "3-4", title: "Protecting the Flock", content: "A shepherd's first duty is protection..." },
    ],
    featured: true,
  },
];

export interface Sermon {
  id: string;
  title: string;
  scripture: string;
  excerpt: string;
  manuscript: string;
  accessLevel: "free" | "member" | "pastor";
  date: string;
  category: string;
  price: number;
  isFree: boolean;
  previewCutoff: number;
  featured: boolean;
  audioUrl?: string;
}

export const sermons: Sermon[] = [
  {
    id: "1",
    title: "The Power of One",
    scripture: "Deuteronomy 32:30",
    excerpt: "One person fully surrendered to God can change the course of a nation. Explore what it means to be that one.",
    manuscript: `One can chase a thousand. That's not poetry — that's a promise. Deuteronomy 32:30 tells us that one person, fully aligned with God's purpose, carries the authority to shift the atmosphere of an entire generation.

We live in a culture obsessed with numbers. We count followers, we count seats, we count likes. But God has always been in the business of using one. One Moses. One David. One Elijah. One Mary. One Jesus.

The question isn't whether God can use one person. The question is whether you're willing to be that one.

Being "the one" doesn't mean you have all the answers. It means you have all the surrender. It means you've stopped waiting for the crowd to move and you've decided to move on your own — with God.

There's a loneliness that comes with being the one. You won't always be understood. You won't always be celebrated. But you will always be covered. Because when God calls you out, He doesn't leave you out there alone.

I want to challenge you today: stop waiting for permission from people to do what God has already given you permission to do. Stop looking around for a crowd and start looking up for a calling.

One person with God is a majority. One voice crying in the wilderness can prepare the way for the Lord. One act of obedience can break a generational curse.

You are that one. Not because you're special in yourself — but because the God who lives in you is extraordinary. Step into it. Own it. Walk in it. The power of one is not about you — it's about the One who sent you.`,
    accessLevel: "free",
    date: "2025-12-15",
    category: "Faith",
    price: 0,
    isFree: true,
    previewCutoff: 3,
    featured: true,
  },
  {
    id: "2",
    title: "Wilderness Worship",
    scripture: "Psalm 63:1-4",
    excerpt: "Your most powerful worship doesn't happen in the sanctuary — it happens in the desert. Learn to praise in the dry season.",
    manuscript: `O God, you are my God; earnestly I seek you; my soul thirsts for you; my flesh faints for you, as in a dry and weary land where there is no water.

David didn't write Psalm 63 from the comfort of the palace. He wrote it from the wilderness of Judah — running, hiding, desperate. And yet, in the middle of that desert, he found something he never found on the throne: raw, unfiltered worship.

There's a worship that only comes from the wilderness. It's not polished. It's not produced. It's not performed. It's the cry of a soul that has nothing left but God — and discovers that God is more than enough.

We want God to take us out of the wilderness. But sometimes God takes us into the wilderness so He can have us to Himself. The desert strips away every distraction, every false comfort, every pretend praise. What's left is real.

If you're in a dry season right now, I need you to hear me: this is not punishment. This is preparation. God is doing something in you that can only happen in the barren places.

The sanctuary worship is beautiful. But wilderness worship is powerful. Because when you praise God with nothing — no band, no lights, no crowd — you prove that your worship was never about the atmosphere. It was about the Author.

Don't wait for the rain to praise. Praise in the drought. Don't wait for the breakthrough to worship. Worship in the breaking. That's where the real power is.

Your wilderness is not your ending. It's your altar.`,
    accessLevel: "free",
    date: "2025-11-28",
    category: "Worship",
    price: 0,
    isFree: true,
    previewCutoff: 3,
    featured: false,
  },
  {
    id: "3",
    title: "Called to the Deep",
    scripture: "Luke 5:4",
    excerpt: "Jesus didn't call Peter to stay at the shore. He called him to launch out into the deep. Are you ready?",
    manuscript: `"Launch out into the deep." Five words that changed everything for Peter. He had been fishing all night — tired, frustrated, empty-handed. And then Jesus showed up and told him to go deeper.

Peter could have stayed at the shore. The shore is comfortable. The shore is predictable. The shore is safe. But the shore is also shallow. And God didn't call you to live a shallow life.

The deep is where the miracles are. The deep is where the nets break because the blessing is too big for your current capacity. The deep is where everything you've been praying for is waiting.

But here's the thing about the deep: you can't see the bottom. You can't control it. You can't predict it. That's why most people stay at the shore — because the deep requires faith.

Peter said, "Master, we've worked hard all night and haven't caught anything." In other words: "I've tried. It didn't work. I'm tired." Sound familiar?

But then he added five words that changed his life: "But because you say so." Not because it makes sense. Not because I feel like it. Not because I can see the outcome. But because YOU say so.

That's the kind of obedience that unlocks the deep. Tired obedience. Reluctant obedience. Obedience that doesn't understand but moves anyway.

God is calling you past the shore today. Past your comfort zone. Past your understanding. Past your fear. Launch out. The deep is calling your name.`,
    accessLevel: "member",
    date: "2025-11-10",
    category: "Calling",
    price: 4.99,
    isFree: false,
    previewCutoff: 2,
    featured: true,
  },
  {
    id: "4",
    title: "The Weight of the Anointing",
    scripture: "1 Samuel 16:13",
    excerpt: "The anointing isn't light — it's heavy. Understanding the responsibility that comes with God's hand on your life.",
    manuscript: `Then Samuel took the horn of oil and anointed him in the midst of his brothers. And the Spirit of the Lord rushed upon David from that day forward.

We celebrate the anointing. We sing about it. We chase it. We pray for it. But do we understand what it costs?

The anointing isn't a badge of honor — it's a burden of responsibility. When God puts His hand on your life, He's not giving you a trophy. He's giving you a weight. And that weight will either make you stronger or crush you, depending on your posture.

David was anointed as a teenager, but he didn't sit on the throne for over a decade. In between the oil and the crown, there was a cave. There was a wilderness. There was a king trying to kill him. The anointing didn't protect David from trouble — it prepared him through trouble.

If you've been anointed for something and it feels like everything is going wrong, that's not a contradiction. That's the process. The weight you feel isn't God abandoning you — it's God training you to carry what He's about to give you.

Not everyone can handle the anointing. That's why God doesn't give it to everyone in the same measure. He measures the oil by your capacity to carry the weight.

Stop asking for a bigger anointing if you're not willing to carry a bigger weight. Stop praying for influence if you're not ready for the isolation that comes with it.

The anointing is real. The calling is real. But the cost is real too. Count it. Carry it. And don't you dare put it down.`,
    accessLevel: "pastor",
    date: "2025-10-22",
    category: "Leadership",
    price: 7.99,
    isFree: false,
    previewCutoff: 2,
    featured: false,
  },
  {
    id: "5",
    title: "Breaking Generational Chains",
    scripture: "Galatians 5:1",
    excerpt: "Freedom isn't just for you — it's for every generation after you. Learn to break the chains that bind your bloodline.",
    manuscript: `It is for freedom that Christ has set us free. Stand firm, then, and do not let yourselves be burdened again by a yoke of slavery.

Freedom isn't a one-time event — it's a generational assignment. When God breaks a chain in your life, He's not just freeing you. He's freeing your children. Your grandchildren. Every generation that comes after you.

But here's the hard truth: chains don't break themselves. Someone has to be the first to say "enough." Someone has to be the one who stands up in the middle of a generational pattern and declares, "This ends with me."

Maybe it's addiction. Maybe it's poverty. Maybe it's abuse. Maybe it's a spirit of fear that's been running through your family for decades. Whatever it is, it has an expiration date — and that date is today.

You weren't born into that family by accident. God placed you there strategically because He knew you had the faith to break what everyone before you accepted as normal.

Breaking chains isn't pretty. It's violent in the spirit. It requires warfare, fasting, prayer, and an absolute refusal to settle. You'll face resistance — from the enemy, from family members who don't understand, even from your own flesh.

But when that chain finally snaps, the sound echoes through eternity. Your children will walk in a freedom they didn't have to fight for — because you fought for them.

Be the chain breaker. Be the cycle ender. Be the one who looks at generational bondage and says, "Not on my watch." Freedom is your inheritance. Claim it.`,
    accessLevel: "free",
    date: "2025-10-05",
    category: "Deliverance",
    price: 0,
    isFree: true,
    previewCutoff: 3,
    featured: true,
  },
];

export const videos = [
  {
    id: "1",
    title: "The Island of One – Ministry Vision",
    thumbnail: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=640&h=360&fit=crop",
    duration: "12:34",
    category: "Ministry",
    featured: true,
  },
  {
    id: "2",
    title: "Sunday Message: Stand Firm",
    thumbnail: "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=640&h=360&fit=crop",
    duration: "45:12",
    category: "Sermons",
    featured: true,
  },
  {
    id: "3",
    title: "Leadership Conference Keynote",
    thumbnail: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=640&h=360&fit=crop",
    duration: "58:30",
    category: "Speaking",
    featured: false,
  },
  {
    id: "4",
    title: "Behind the Book: Finding Your Island",
    thumbnail: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=640&h=360&fit=crop",
    duration: "18:45",
    category: "Books",
    featured: false,
  },
  {
    id: "5",
    title: "Devotional: Morning with God",
    thumbnail: "https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?w=640&h=360&fit=crop",
    duration: "8:20",
    category: "Devotional",
    featured: true,
  },
];

export const speakingTopics = [
  "Faith in Isolation — Finding God in the Wilderness",
  "The Power of One — Individual Impact in a Collective World",
  "Leading from the Island — Pastoral Leadership",
  "Breaking Chains — Generational Freedom",
  "The Author's Journey — Writing for Ministry",
];

export const membershipPlans = [
  {
    id: "reader",
    name: "Reader",
    price: 9.99,
    features: ["Access to all books", "Monthly devotional", "Community forum", "Early access to new releases"],
  },
  {
    id: "pastor",
    name: "Pastor",
    price: 19.99,
    features: ["Everything in Reader", "Full sermon library", "Sermon notes & outlines", "Pastor-only resources", "Ministry support group"],
  },
  {
    id: "inner-circle",
    name: "Inner Circle",
    price: 39.99,
    features: ["Everything in Pastor", "Monthly live Q&A", "Exclusive video content", "Direct messaging", "Priority speaking requests", "Signed book editions"],
  },
];
