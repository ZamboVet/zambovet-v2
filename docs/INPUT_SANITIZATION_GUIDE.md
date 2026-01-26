# Input Sanitization & Layout Protection Guide

## Status: ⚠️ PARTIALLY PROTECTED (Improvements Made)

The application has some input sanitization but **lacked proper protection** against long text without spaces breaking layouts. Fixes have been applied to medical notes and consultation fields.

## What is the Layout Shift Bug?

When users enter very long text without spaces (e.g., URLs, long medical terms, or spam), it can break the UI layout by:
- Overflowing containers horizontally
- Breaking responsive grid layouts
- Causing horizontal page scrolling
- Making content unreadable

**Example:**
```
Input: "thisisaverylongmedicalterminationwithoutanyspacesthatcancauselayoutissuesandbreaktheentireUIdesignmakingitunreadableandunusable"

Result: Text overflows container → breaks layout → horizontal scroll
```

## Vulnerabilities Found

### 1. Medical Notes Fields (FIXED) ✅

**Location:** `@/app/veterinarian/consultations/[appointmentId]/page.tsx`

**Before (Vulnerable):**
```tsx
// Vitals notes - no maxLength, no word-break
<input value={vitalsForm.notes} 
       onChange={e=>setVitalsForm(v=>({...v, notes:e.target.value}))} 
       placeholder="Optional notes" 
       className="w-full px-3 py-2 rounded-xl..."/>

// Display - no word-break
<div className="rounded-xl bg-gray-50 p-3 text-gray-700">
  {vitalsForm.notes || '—'}
</div>
```

**Problems:**
- ❌ No character limit
- ❌ No word-break CSS
- ❌ Long text without spaces breaks layout
- ❌ Can overflow container

**After (Fixed):**
```tsx
// Input with maxLength
<input value={vitalsForm.notes} 
       onChange={e=>setVitalsForm(v=>({...v, notes:e.target.value}))} 
       placeholder="Optional notes" 
       maxLength={500}
       className="w-full px-3 py-2 rounded-xl..."/>

// Display with word-break
<div className="rounded-xl bg-gray-50 p-3 text-gray-700 break-words">
  {vitalsForm.notes || '—'}
</div>
```

**Benefits:**
- ✅ 500 character limit prevents excessive input
- ✅ `break-words` CSS breaks long words
- ✅ Layout protected from overflow
- ✅ Maintains readability

### 2. Diagnosis Fields (FIXED) ✅

**Before (Vulnerable):**
```tsx
// Diagnosis text - no limits
<input value={d.text} 
       onChange={...} 
       placeholder="Diagnosis" 
       className="w-full min-w-0..."/>

// Diagnosis notes - no limits
<input value={d.notes} 
       onChange={...} 
       placeholder="Notes" 
       className="flex-1 min-w-0..."/>

// Display - no word-break
<div className="mt-1 text-gray-900">{d.text}</div>
<div className="text-gray-700">{d.notes || '—'}</div>
```

**After (Fixed):**
```tsx
// Diagnosis text with 200 char limit
<input value={d.text} 
       onChange={...} 
       placeholder="Diagnosis" 
       maxLength={200}
       className="w-full min-w-0..."/>

// Diagnosis notes with 500 char limit
<input value={d.notes} 
       onChange={...} 
       placeholder="Notes" 
       maxLength={500}
       className="flex-1 min-w-0..."/>

// Display with word-break
<div className="mt-1 text-gray-900 break-words">{d.text}</div>
<div className="text-gray-700 break-words">{d.notes || '—'}</div>
```

### 3. Prescription Fields (FIXED) ✅

**Before (Vulnerable):**
```tsx
// Medication name - no limit
<input value={r.name} placeholder="Medication name" />

// Duration - no limit
<input value={r.duration} placeholder="Duration" />

// Instructions - no limit
<input value={r.instr} placeholder="Instructions" />
```

**After (Fixed):**
```tsx
// Medication name with 200 char limit
<input value={r.name} placeholder="Medication name" maxLength={200} />

// Duration with 100 char limit
<input value={r.duration} placeholder="Duration" maxLength={100} />

// Instructions with 500 char limit
<input value={r.instr} placeholder="Instructions" maxLength={500} />

// Display with word-break
<div className="text-gray-900 break-words">{r.name}</div>
<div className="text-gray-700 break-words">{r.instr || '—'}</div>
```

## Character Limits Applied

| Field | Limit | Reason |
|-------|-------|--------|
| Vitals notes | 500 | Brief clinical observations |
| Diagnosis text | 200 | Concise diagnosis name |
| Diagnosis notes | 500 | Additional context |
| Medication name | 200 | Drug name + formulation |
| Duration | 100 | Treatment period |
| Instructions | 500 | Dosing instructions |

## CSS Word-Break Classes

### Tailwind CSS Classes Used

```css
/* break-words - Breaks long words at arbitrary points */
.break-words {
  overflow-wrap: break-word;
  word-wrap: break-word;
}

/* Alternative: break-all (breaks at any character) */
.break-all {
  word-break: break-all;
}

/* For containers that need overflow protection */
.min-w-0 {
  min-width: 0;
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### When to Use Each

**`break-words`** (Recommended for most text):
- Breaks long words at natural break points
- Preserves readability
- Use for: notes, descriptions, instructions

**`break-all`** (Use sparingly):
- Breaks at any character
- Can break mid-word awkwardly
- Use for: URLs, technical IDs

**`truncate`** (For single-line text):
- Shows ellipsis (...)
- Prevents wrapping
- Use for: titles, names in tables

**`min-w-0`** (For flex/grid items):
- Allows shrinking below content size
- Prevents overflow in flex/grid
- Use with: flex-1, grid columns

## Input Sanitization Best Practices

### 1. Always Set maxLength

```tsx
// ✅ GOOD - Prevents excessive input
<input maxLength={200} />
<textarea maxLength={1000} />

// ❌ BAD - No limit
<input />
<textarea />
```

### 2. Add Word-Break to Display Elements

```tsx
// ✅ GOOD - Protects layout
<div className="break-words">{longText}</div>

// ❌ BAD - Can overflow
<div>{longText}</div>
```

### 3. Use min-w-0 in Flex/Grid

```tsx
// ✅ GOOD - Allows shrinking
<div className="flex gap-2">
  <div className="flex-1 min-w-0 break-words">{text}</div>
</div>

// ❌ BAD - Can overflow parent
<div className="flex gap-2">
  <div className="flex-1">{text}</div>
</div>
```

### 4. Sanitize Special Characters

```tsx
// Example from CreateAppointmentModal
const sanitizeReason = (s: string) => {
  try {
    const nf = s.normalize('NFKC');
    const cleaned = nf.replace(/[^A-Za-z0-9 \t\n.,\-'/()&+:#?%!]/g, "");
    const collapsed = cleaned.replace(/\s+/g, " ");
    return collapsed.slice(0, 200);
  } catch {
    return s.slice(0, 200);
  }
};
```

### 5. Validate on Submit

```tsx
const isValid = (text: string) => {
  if (!text || text.length < 3) return false;
  if (!/[A-Za-z]/.test(text)) return false; // Must contain letters
  if (/^[^A-Za-z0-9]+$/.test(text)) return false; // Not only symbols
  if (/(.)\1\1\1/.test(text)) return false; // No 4+ repeated chars
  return true;
};
```

## Other Areas to Check

### Review Modal (Already Protected) ✅

**Location:** `@/app/pet_owner/components/ReviewModal.tsx:109-142`

```tsx
<textarea
  id="review_comment"
  maxLength={500}
  style="..."
></textarea>
<span id="char_count">0/500</span>
```

**Features:**
- ✅ 500 character limit
- ✅ Live character counter
- ✅ Visual feedback

### Appointment Reason (Already Protected) ✅

**Location:** `@/app/pet_owner/components/CreateAppointmentModal.tsx:49-68`

```tsx
const sanitizeReason = (s: string) => {
  const nf = s.normalize('NFKC');
  const cleaned = nf.replace(/[^A-Za-z0-9 \t\n.,\-'/()&+:#?%!]/g, "");
  const collapsed = cleaned.replace(/\s+/g, " ");
  return collapsed.slice(0, 200);
};

const isReasonValid = (s: string) => {
  if (!s || s.length < 3) return false;
  if (!/[A-Za-z]/.test(s)) return false;
  if (/^[^A-Za-z0-9]+$/.test(s)) return false;
  if (/(.)\1\1\1/.test(s)) return false;
  return true;
};
```

**Features:**
- ✅ Unicode normalization
- ✅ Special character filtering
- ✅ Whitespace collapsing
- ✅ 200 character limit
- ✅ Validation rules

### Settings Pages (Already Protected) ✅

**Location:** `@/app/veterinarian/settings/page.tsx:450,456`

```tsx
<input value={name} 
       onChange={(e) => setName(sanitizeName(e.target.value))} 
       maxLength={120} />

<input value={phone} 
       onChange={(e) => setPhone(sanitizePhone(e.target.value))} 
       maxLength={20} 
       inputMode="tel" 
       pattern="(\+639\d{9}|09\d{9})" />
```

**Features:**
- ✅ Input sanitization functions
- ✅ maxLength constraints
- ✅ Pattern validation
- ✅ Input mode hints

## Testing Checklist

### Manual Testing

- [ ] Enter very long text without spaces in notes field
- [ ] Verify text breaks properly (no horizontal overflow)
- [ ] Check maxLength prevents excessive input
- [ ] Test with special characters (emoji, symbols)
- [ ] Verify layout remains intact on mobile
- [ ] Test with URLs and long medical terms
- [ ] Check display in preview/read-only mode

### Test Cases

**Test 1: Long Text Without Spaces**
```
Input: "thisisaverylongmedicalterminationwithoutanyspacesthatcancauselayoutissuesandbreaktheentireUIdesignmakingitunreadableandunusable"

Expected:
- Input stops at maxLength (500 chars)
- Display breaks words with break-words
- No horizontal overflow
- Layout remains intact
```

**Test 2: Special Characters**
```
Input: "Patient has 🐕 allergies!!! @#$%^&*()"

Expected:
- Special characters allowed (medical context)
- Display renders correctly
- No layout issues
```

**Test 3: Very Long URL**
```
Input: "https://www.verylongdomainname.com/with/very/long/path/that/could/break/layout"

Expected:
- URL breaks at slashes or dots
- No horizontal overflow
- Readable on mobile
```

**Test 4: Repeated Characters**
```
Input: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

Expected:
- Breaks properly with break-words
- No layout shift
- Validation may reject (if using isReasonValid)
```

## Database Constraints

### Check Column Limits

```sql
-- Check text column types
SELECT 
  table_name, 
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('consultation_vitals', 'consultation_diagnoses', 'consultation_prescriptions')
  AND data_type = 'text';
```

**PostgreSQL `text` type:**
- No length limit (up to 1GB)
- Application must enforce limits
- Use `maxLength` in UI
- Consider `VARCHAR(n)` for strict limits

### Recommended Database Constraints

```sql
-- Add check constraints for length
ALTER TABLE consultation_vitals
ADD CONSTRAINT vitals_notes_length CHECK (length(notes) <= 500);

ALTER TABLE consultation_diagnoses
ADD CONSTRAINT diagnosis_text_length CHECK (length(diagnosis_text) <= 200),
ADD CONSTRAINT diagnosis_notes_length CHECK (length(notes) <= 500);

ALTER TABLE consultation_prescriptions
ADD CONSTRAINT medication_name_length CHECK (length(medication_name) <= 200),
ADD CONSTRAINT instructions_length CHECK (length(instructions) <= 500);
```

## Summary of Changes

### Files Modified

**`@/app/veterinarian/consultations/[appointmentId]/page.tsx`**

**Changes:**
1. ✅ Added `maxLength={500}` to vitals notes input
2. ✅ Added `maxLength={200}` to diagnosis text input
3. ✅ Added `maxLength={500}` to diagnosis notes input
4. ✅ Added `maxLength={200}` to medication name input
5. ✅ Added `maxLength={100}` to duration input
6. ✅ Added `maxLength={500}` to instructions input
7. ✅ Added `break-words` class to all display elements

**Impact:**
- Prevents layout breaking from long text
- Maintains UI integrity on all screen sizes
- Improves user experience
- Protects against spam/abuse

## Best Practices Summary

### Input Fields
```tsx
<input 
  maxLength={200}                    // ✅ Limit length
  className="min-w-0"                // ✅ Allow shrinking
  onChange={e => sanitize(e.value)}  // ✅ Sanitize input
/>
```

### Display Elements
```tsx
<div className="break-words min-w-0">  {/* ✅ Break long words */}
  {longText}
</div>
```

### Flex/Grid Containers
```tsx
<div className="flex gap-2">
  <div className="flex-1 min-w-0 break-words">  {/* ✅ Prevent overflow */}
    {content}
  </div>
</div>
```

### Validation
```tsx
const validate = (text: string) => {
  if (text.length > 500) return false;        // ✅ Length check
  if (!/[A-Za-z]/.test(text)) return false;   // ✅ Content check
  if (/(.)\1{3,}/.test(text)) return false;   // ✅ Spam check
  return true;
};
```

## Conclusion

✅ **Layout protection implemented**
✅ **maxLength constraints added**
✅ **word-break CSS applied**
✅ **Input sanitization in place**

The medical notes and consultation fields are now protected against layout-breaking long text. The application follows best practices for input sanitization and layout protection.
