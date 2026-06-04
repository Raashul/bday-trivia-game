# Quick Fixes

## TypeError: Cannot read property 'x' of undefined

```typescript
// Error
user.profile.name
// user or profile is undefined

// Fix: Optional chaining
user?.profile?.name

// Fix: Default value
user?.profile?.name ?? 'Unknown'

// Fix: Guard clause
if (!user?.profile) {
  return null;
}
return user.profile.name;
```

## Unhandled Promise Rejection

```typescript
// Error
fetchData().then(process);
// What if fetchData rejects?

// Fix: Add catch
fetchData()
  .then(process)
  .catch(error => {
    console.error('Fetch failed:', error);
  });

// Fix: try/catch with await
try {
  const data = await fetchData();
  await process(data);
} catch (error) {
  console.error('Operation failed:', error);
}
```

## React: Too Many Re-renders

```typescript
// Error: Calling setState during render
function Component() {
  const [count, setCount] = useState(0);
  setCount(count + 1); // Infinite loop!
}

// Fix: Use useEffect for side effects
function Component() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(c => c + 1);
  }, []); // Only on mount
}

// Error: Object/array in dependency array
useEffect(() => {}, [{ a: 1 }]); // New object every render!

// Fix: Memoize or use primitives
const config = useMemo(() => ({ a: 1 }), []);
useEffect(() => {}, [config]);
```

## CORS Error

```typescript
// Browser blocks cross-origin request

// Fix 1: Server - Add CORS headers
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

// Fix 2: Proxy in development (Vite)
// vite.config.ts
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
};
```

## Maximum Call Stack Size Exceeded

```typescript
// Error: Infinite recursion
function factorial(n) {
  return n * factorial(n - 1); // No base case!
}

// Fix: Add base case
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

// Error: Circular dependency in objects
const a = {};
const b = { ref: a };
a.ref = b;
JSON.stringify(a); // Fails!

// Fix: Break circular reference
JSON.stringify(a, (key, value) => {
  if (key === 'ref') return '[Circular]';
  return value;
});
```

## Module Not Found

```bash
# Error: Cannot find module 'x'

# Fix 1: Install the package
npm install x

# Fix 2: Check import path
import x from './x';     # Relative - needs ./
import x from 'x';       # Package - no ./

# Fix 3: Check file extension
import x from './x.js';  # ESM may need extension

# Fix 4: Clear cache
rm -rf node_modules package-lock.json
npm install
```

## Async/Await Issues

```typescript
// Error: await in non-async function
function getData() {
  const data = await fetch('/api'); // SyntaxError!
}

// Fix: Mark function as async
async function getData() {
  const data = await fetch('/api');
}

// Error: forEach doesn't await
items.forEach(async item => {
  await process(item); // Doesn't wait!
});

// Fix: Use for...of
for (const item of items) {
  await process(item);
}

// Fix: Use Promise.all for parallel
await Promise.all(items.map(item => process(item)));
```

## .NET Core REST API — NullReferenceException

```csharp
// Error: Object reference not set to an instance of an object
var city = order.Customer.Address.City;

// Fix: null-conditional chain
var city = order?.Customer?.Address?.City ?? "Unknown";

// Fix: guard clause in action method
if (order?.Customer?.Address is null)
    return BadRequest("Customer address is required");
```

## .NET Core — 500 on Unhandled Exception

```csharp
// Error: Request returns 500 with no useful body in Production
// Fix: add global exception handler in Program.cs

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var ex = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        context.Response.StatusCode = 500;
        await context.Response.WriteAsJsonAsync(new
        {
            error = ex?.Message
        });
    });
});

// Alternative (ASP.NET Core 8+): problem details
builder.Services.AddProblemDetails();
app.UseExceptionHandler();
```

## .NET Core — CORS Error from Frontend

```csharp
// Error: Browser blocks request — "No 'Access-Control-Allow-Origin' header"
// Fix: add CORS policy in Program.cs

builder.Services.AddCors(options =>
{
    options.AddPolicy("Dev", policy =>
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

app.UseCors("Dev"); // must be before UseRouting / UseAuthorization
```

## .NET Core — 401 / 403 on Authenticated Endpoint

```bash
# Check: is UseAuthentication() called BEFORE UseAuthorization()?
# Correct order in Program.cs:
app.UseAuthentication();
app.UseAuthorization();

# Verify JWT token claims
# Decode at jwt.io — check exp, iss, aud match appsettings.json
```

```csharp
// Common: audience mismatch
// appsettings.json
"Jwt": {
  "Audience": "my-api",   // must match token aud claim
  "Issuer": "my-auth"     // must match token iss claim
}
```

## .NET Core — Model Validation Silently Returns 400

```csharp
// Error: controller action never reached, 400 returned with no body
// Cause: [ApiController] auto-validates and short-circuits

// Fix: check what validation failed
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = ctx =>
    {
        var errors = ctx.ModelState
            .Where(e => e.Value?.Errors.Count > 0)
            .ToDictionary(k => k.Key, v => v.Value!.Errors.Select(e => e.ErrorMessage));
        return new BadRequestObjectResult(new { errors });
    };
});
```

## .NET Core — EF Core N+1 Query

```csharp
// BUG: each iteration fires a separate DB query
var orders = await _db.Orders.ToListAsync();
foreach (var o in orders)
{
    var name = o.Customer.Name; // lazy-load hits DB every iteration
}

// Fix: eager-load with Include
var orders = await _db.Orders
    .Include(o => o.Customer)
    .ToListAsync();

// Fix: enable query logging to spot N+1
// appsettings.Development.json
{
  "Logging": {
    "LogLevel": {
      "Microsoft.EntityFrameworkCore.Database.Command": "Information"
    }
  }
}
```

## Quick Reference

| Error Message | Likely Fix |
|--------------|------------|
| Cannot read property of undefined | Optional chaining `?.` |
| Unhandled promise rejection | Add `.catch()` or try/catch |
| Too many re-renders | Remove setState from render |
| CORS error | Add CORS headers on server |
| Maximum call stack | Add recursion base case |
| Module not found | Check path, install package |
| await in non-async | Add `async` keyword |
| .NET NullReferenceException | Null-conditional `?.` or guard clause |
| .NET 500 no body | Add `UseExceptionHandler` middleware |
| .NET CORS blocked | `AddCors` + `UseCors` before routing |
| .NET 401/403 | Check middleware order: Auth before Authz |
| .NET silent 400 | `[ApiController]` validation — inspect ModelState |
| .NET slow with more rows | EF Core N+1 — add `.Include()` |
