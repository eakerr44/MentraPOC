# Mentra Assets Directory

This directory contains the authentic Mentra branding assets used throughout the application.

## Required Assets

### Logo
Please place the official Mentra logo in the following location:

```
frontend/public/assets/logo/
└── logo_with_words.png    # Official Mentra logo with wordmark
```

### Sprig Mascot Icons
Please place the Sprig mascot icons in the following location:

```
frontend/public/assets/sprig/
├── book.png          # Sprig reading/learning (used for Journal navigation)
├── classwork.png     # Sprig doing assignments (used for Problems navigation)
├── goodgrades.png    # Sprig celebrating achievements
├── idea.png          # Sprig having ideas (used for Help navigation)
├── love.png          # Sprig showing love/heart
├── Money.png         # Sprig with rewards/coins
├── pointing.png      # Sprig pointing/guiding
├── shootingstar.png  # Sprig with shooting star
├── stars.png         # Sprig with stars (used for Dashboard navigation)
└── smile.png         # Sprig smiling (used for encouragement messages)
```

## How the Assets are Used

### Navigation Icons
- **Dashboard**: `stars.png` - Sprig with stars representing progress and overview
- **Journal**: `book.png` - Sprig reading, representing learning and reflection
- **Problems**: `classwork.png` - Sprig doing work, representing problem-solving
- **Help**: `idea.png` - Sprig with lightbulb, representing guidance and tips

### Emotional Context
- **Happy/Encouragement**: `smile.png` - Used in sidebar encouragement widget
- **Achievement**: `goodgrades.png` - For celebrating accomplishments
- **Love/Connection**: `love.png` - For emotional learning moments
- **Excitement**: `shootingstar.png` - For milestone celebrations

### Interaction Context
- **Guidance**: `pointing.png` - For directing attention or providing guidance
- **Rewards**: `Money.png` - For achievement rewards or progress incentives

## Implementation

The assets are used through the `SprigIcon` component located at:
```
frontend/src/components/SprigIcon.tsx
```

This component provides:
- Type-safe icon selection
- Consistent sizing (sm, md, lg)
- Accessibility features with descriptive alt text
- Visual enhancements (drop shadows, optimized rendering)

## Brand Consistency

These Sprig icons maintain consistency with Mentra's brand identity by:
- Using the authentic mascot character throughout the interface
- Providing contextually appropriate expressions and activities
- Supporting the warm, encouraging tone defined in the brand guide
- Reinforcing the learning and growth theme central to Mentra's mission 