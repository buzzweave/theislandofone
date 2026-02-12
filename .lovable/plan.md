

## Make Hero Banners Responsive on Mobile

The hero carousel already has some responsive classes, but there are several improvements needed for a polished mobile experience.

### Changes to `src/components/HeroCarousel.tsx`

1. **Reduce minimum height on small screens** -- Change `min-h-[70vh]` to `min-h-[55vh]` for very small phones, keeping the current breakpoints for larger screens.

2. **Scale down navigation arrows on mobile** -- Reduce arrow button size and icon size on small screens (smaller padding, smaller icons) so they don't crowd the content.

3. **Move dot indicators closer to bottom on mobile** -- Change `bottom-8` to `bottom-4 sm:bottom-8` so dots don't overlap with CTA buttons on short screens.

4. **Tighten text spacing on mobile** -- Reduce `mb-8` on the subtitle paragraph to `mb-6 sm:mb-8` to prevent overflow on small viewports.

5. **Ensure CTA buttons don't overflow** -- Add `w-full sm:w-auto` to both CTA buttons so they stack full-width on phones and shrink on larger screens.

6. **Image object-position** -- Add `object-center` to the background images to ensure the focal point stays centered on narrow screens.

### Technical Summary

All changes are CSS/Tailwind class adjustments in `HeroCarousel.tsx` only -- no logic or structural changes needed. The key modifications:

- Section: `min-h-[55vh] sm:min-h-[70vh] md:min-h-[80vh] lg:min-h-[90vh]`
- Nav arrows: `p-1.5 sm:p-2`, icons `h-5 w-5 sm:h-6 sm:w-6`
- Dots: `bottom-4 sm:bottom-8`
- Subtitle margin: `mb-6 sm:mb-8`
- CTA links: add `w-full sm:w-auto`
- Images: add `object-center`
