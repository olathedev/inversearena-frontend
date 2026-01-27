# Global Notification System Design

## Overview

The Global Notification System provides a comprehensive toast notification infrastructure for the Inverse Arena application. It replaces generic console.log statements and browser alerts with a high-fidelity UI that maintains consistency with the application's neon-pink/neon-green dark aesthetic. The system supports multiple simultaneous notifications, automatic dismissal, manual dismissal, and full accessibility compliance.

## Architecture

The notification system follows a provider-consumer pattern using React Context:

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Root                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              NotificationProvider                     │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │            Application Components               │  │  │
│  │  │  ┌─────────────────────────────────────────┐    │  │  │
│  │  │  │        useNotification Hook             │    │  │  │
│  │  │  │  - notify()                             │    │  │  │
│  │  │  │  - notify.success()                     │    │  │  │
│  │  │  │  - notify.error()                       │    │  │  │
│  │  │  │  - notify.info()                        │    │  │  │
│  │  │  │  - notify.warning()                     │    │  │  │
│  │  │  └─────────────────────────────────────────┘    │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │         NotificationContainer               │  │  │
│  │  │  ┌─────────────────────────────────────────┐    │  │  │
│  │  │  │        NotificationCard[]               │    │  │  │
│  │  │  │  - Toast UI                             │    │  │  │
│  │  │  │  - Progress Bar                         │    │  │  │
│  │  │  │  - Close Button                         │    │  │  │
│  │  │  │  - Type-specific Styling                │    │  │  │
│  │  │  └─────────────────────────────────────────┘    │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┐  │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### NotificationProvider
- **Location**: `src/components/ui/NotificationProvider.tsx`
- **Purpose**: Manages global notification state and provides context to child components
- **State Management**: Maintains array of active notifications with unique IDs
- **Methods**: `addNotification`, `removeNotification`, `clearAllNotifications`

### NotificationContext
- **Type Definitions**: Notification configuration, provider state, and context interface
- **Notification Interface**:
  ```typescript
  interface Notification {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    duration?: number;
    persistent?: boolean;
  }
  ```

### useNotification Hook
- **Location**: `src/shared-d/hooks/useNotification.ts`
- **Purpose**: Provides simple API for components to trigger notifications
- **API Surface**:
  - `notify(config: NotificationConfig)` - Generic notification function
  - `notify.success(message: string, options?)` - Success shortcut
  - `notify.error(message: string, options?)` - Error shortcut
  - `notify.info(message: string, options?)` - Info shortcut
  - `notify.warning(message: string, options?)` - Warning shortcut

### NotificationCard Component
- **Purpose**: Renders individual toast notifications
- **Features**:
  - Type-specific styling and icons (using Lucide React)
  - Progress bar for auto-dismissal visualization
  - Close button for manual dismissal
  - Smooth entrance/exit animations using Framer Motion
  - Full accessibility support with ARIA roles

### NotificationContainer
- **Purpose**: Manages positioning and stacking of multiple notifications
- **Positioning**: Fixed top-right corner with responsive behavior
- **Stacking**: Vertical arrangement with consistent spacing
- **Portal Rendering**: Uses React Portal for proper z-index layering

## Data Models

### Notification Configuration
```typescript
interface NotificationConfig {
  message: string;
  type?: NotificationType;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

type NotificationType = 'success' | 'error' | 'info' | 'warning';
```

### Internal Notification State
```typescript
interface InternalNotification extends NotificationConfig {
  id: string;
  createdAt: number;
  timeoutId?: NodeJS.Timeout;
}
```

### Provider Context Interface
```typescript
interface NotificationContextValue {
  notifications: InternalNotification[];
  addNotification: (config: NotificationConfig) => string;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After reviewing all properties identified in the prework, several can be consolidated:
- Properties 2.1-2.4 (type-specific styling) can be combined into one comprehensive styling property
- Properties 5.1-5.3 (hook API) can be combined into one API surface property  
- Properties 6.2-6.3 (ARIA roles) can be combined with 6.1 for comprehensive accessibility
- Properties 3.1-3.2 (timing) can be combined into one timing property

**Property 1: Notification Display and Stacking**
*For any* notification configuration, when triggered, the system should display the notification in the designated screen area and stack multiple notifications vertically without overlap
**Validates: Requirements 1.1, 1.2, 1.3**

**Property 2: Type-Specific Styling and Icons**
*For any* notification type (success, error, info, warning), the system should apply the correct styling, colors, and icons according to the type
**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

**Property 3: Auto-Dismissal Timing**
*For any* notification with a duration setting, the system should automatically remove it after the specified time and display a progress indicator during countdown
**Validates: Requirements 3.1, 3.2, 3.3**

**Property 4: Manual Dismissal Isolation**
*For any* notification in a stack, when manually dismissed via close button, only that specific notification should be removed without affecting others
**Validates: Requirements 4.1, 4.2, 4.4**

**Property 5: Hook API Completeness**
*For any* component using the notification hook, the system should provide all required methods (notify, notify.success, notify.error, notify.info, notify.warning) that create and display notifications
**Validates: Requirements 5.1, 5.2, 5.3**

**Property 6: Unique Identification and Concurrency**
*For any* number of notifications triggered simultaneously, each should receive a unique identifier and all should be handled without conflicts
**Validates: Requirements 5.4, 5.5**

**Property 7: Accessibility Compliance**
*For any* notification type, the system should use appropriate ARIA roles (status for success/info, alert for error/warning) and provide accessible labeling for interactive elements
**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

**Property 8: Positioning and Layout**
*For any* viewport size, notifications should be positioned in the top-right corner using fixed positioning with consistent spacing between stacked items
**Validates: Requirements 7.1, 7.2, 7.4**

## Error Handling

### Notification Failures
- **Invalid Configuration**: Gracefully handle missing or invalid notification configurations
- **Context Unavailability**: Provide meaningful error messages when hook is used outside provider
- **Memory Management**: Automatically clean up timeouts and prevent memory leaks
- **Portal Rendering**: Handle cases where document.body is unavailable during SSR

### Timeout Management
- **Cleanup on Unmount**: Clear all active timeouts when provider unmounts
- **Duplicate Prevention**: Prevent duplicate notifications with identical content within short time windows
- **Maximum Stack Size**: Implement optional maximum notification limit to prevent UI overflow

## Testing Strategy

### Dual Testing Approach

The notification system will use both unit testing and property-based testing to ensure comprehensive coverage:

**Unit Testing**:
- Specific examples of notification creation and dismissal
- Edge cases like empty messages or invalid configurations
- Integration points between provider, hook, and components
- Accessibility attribute verification
- Animation trigger verification

**Property-Based Testing**:
- Universal properties that should hold across all notification configurations
- Timing behavior across different duration values
- Stacking behavior with varying numbers of notifications
- Type-specific styling consistency across all notification types

**Property-Based Testing Library**: We will use `@fast-check/jest` for property-based testing, configured to run a minimum of 100 iterations per property test.

**Test Tagging**: Each property-based test will be tagged with a comment explicitly referencing the correctness property using the format: `**Feature: global-notification-system, Property {number}: {property_text}**`

### Testing Framework Integration
- **Unit Tests**: Jest with React Testing Library for component testing
- **Property Tests**: Fast-check for property-based testing with 100+ iterations
- **Accessibility Tests**: jest-axe for automated accessibility validation
- **Animation Tests**: Mock Framer Motion for deterministic animation testing

### Test Organization
- Co-locate tests with source files using `.test.ts` suffix
- Separate property tests into dedicated `.property.test.ts` files
- Use descriptive test names that explain the behavior being verified
- Group related tests using `describe` blocks for better organization