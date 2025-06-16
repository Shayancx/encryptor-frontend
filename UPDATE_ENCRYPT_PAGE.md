# Manual Update Required for app/encrypt/page.tsx

Add the following to your encrypt page to show upload limits:

1. Import useAuth:
```tsx
import { useAuth } from "@/lib/contexts/auth-context"
```

2. In the component, add:
```tsx
const { user } = useAuth()
const uploadLimitMB = user ? 4096 : 100
```

3. Update the file validation to use dynamic limit:
```tsx
if (totalSize > uploadLimitMB * 1024 * 1024) {
  toast({
    title: "Files too large",
    description: `Total size of all files must be under ${uploadLimitMB}MB`,
    variant: "destructive"
  })
  return
}
```

4. Add a notice about the limit:
```tsx
{!user && (
  <Alert>
    <AlertDescription>
      You're uploading as a guest (100MB limit). 
      <Link href="/register" className="font-medium underline">
        Create an account
      </Link> to upload up to 4GB.
    </AlertDescription>
  </Alert>
)}
```
