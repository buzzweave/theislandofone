export default function Copyright() {
  return (
    <div className="container mx-auto px-4 md:px-8 py-20 max-w-3xl">
      <h1 className="font-display text-4xl font-bold mb-8">Copyright Notice</h1>
      <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground text-sm leading-relaxed">
        <p>© {new Date().getFullYear()} The Island of One Ministries. All rights reserved.</p>

        <h2 className="font-display text-lg font-semibold text-foreground mt-8">Ownership of Content</h2>
        <p>
          All content published on this website — including but not limited to text, graphics, logos, images, audio clips, video clips, digital downloads, sermon transcripts, book manuscripts, and data compilations — is the property of The Island of One Ministries or its content suppliers and is protected by United States and international copyright laws.
        </p>

        <h2 className="font-display text-lg font-semibold text-foreground mt-8">Permitted Use</h2>
        <p>
          You may access, download, and print materials from this website for your personal, non-commercial use only. You may share brief excerpts (no more than 300 words) for review, commentary, or educational purposes, provided that proper attribution is given to The Island of One Ministries and a link to the original source is included.
        </p>

        <h2 className="font-display text-lg font-semibold text-foreground mt-8">Prohibited Use</h2>
        <p>
          Without the prior written consent of The Island of One Ministries, you may not:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Reproduce, duplicate, copy, sell, resell, or exploit any portion of this website or its content for commercial purposes.</li>
          <li>Modify, distribute, or create derivative works based on the content of this website.</li>
          <li>Use any data mining, robots, or similar data gathering or extraction methods on this website.</li>
          <li>Frame or mirror any portion of this website on any other server or internet-based device.</li>
        </ul>

        <h2 className="font-display text-lg font-semibold text-foreground mt-8">Trademarks</h2>
        <p>
          "The Island of One," "The Island of One Ministries," and associated logos and designs are trademarks of The Island of One Ministries. All other trademarks, service marks, and trade names referenced on this website are the property of their respective owners.
        </p>

        <h2 className="font-display text-lg font-semibold text-foreground mt-8">DMCA Notice</h2>
        <p>
          If you believe that any content on this website infringes upon your copyright, please contact us with the following information: (a) a description of the copyrighted work you claim has been infringed; (b) the URL or location on our site where the alleged infringing material is located; (c) your contact information; (d) a statement that you have a good-faith belief that the use is unauthorized; and (e) a statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on behalf of the owner.
        </p>

        <h2 className="font-display text-lg font-semibold text-foreground mt-8">Contact</h2>
        <p>
          For permissions, licensing inquiries, or copyright concerns, please contact The Island of One Ministries at the contact information provided on this website.
        </p>

        <p className="text-xs text-muted-foreground/60 mt-12">Last updated: February 2026</p>
      </div>
    </div>
  );
}
