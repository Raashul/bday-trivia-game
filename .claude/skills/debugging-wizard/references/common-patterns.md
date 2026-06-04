# Common Bug Patterns

## Pattern Recognition

| Pattern | Symptom | Likely Cause |
|---------|---------|--------------|
| Race condition | Intermittent failures | Missing await, async timing |
| Off-by-one | Missing first/last item | `<` vs `<=`, array bounds |
| Null reference | "undefined is not..." | Missing null check |
| Memory leak | Growing memory | Uncleaned listeners/intervals |
| N+1 queries | Slow with more data | Fetching in loop |
| Type coercion | Unexpected behavior | `==` instead of `===` |
| Closure issue | Wrong variable value | Loop variable capture |
| Stale state | Old value used | React state closure |

## Race Condition

```typescript
// BUG: Race condition
let data;
fetchData().then(result => { data = result; });
console.log(data); // undefined!

// FIX: Await the result
const data = await fetchData();
console.log(data);
```

## Off-by-One

```typescript
// BUG: Skips last element
for (let i = 0; i < array.length - 1; i++) { }

// FIX: Include last element
for (let i = 0; i < array.length; i++) { }

// BUG: Array index out of bounds
const last = array[array.length]; // undefined

// FIX: Correct index
const last = array[array.length - 1];
```

## Null Reference

```typescript
// BUG: Crashes if user is null
const name = user.profile.name;

// FIX: Optional chaining
const name = user?.profile?.name ?? 'Unknown';

// FIX: Guard clause
if (!user?.profile) {
  return 'Unknown';
}
return user.profile.name;
```

## Memory Leak

```typescript
// BUG: Listener never removed
useEffect(() => {
  window.addEventListener('resize', handleResize);
}, []);

// FIX: Cleanup function
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

// BUG: Interval never cleared
setInterval(pollData, 1000);

// FIX: Store and clear
const intervalId = setInterval(pollData, 1000);
return () => clearInterval(intervalId);
```

## Closure in Loop

```typescript
// BUG: All callbacks use i = 5
for (var i = 0; i < 5; i++) {
  setTimeout(() => console.log(i), 100);
}

// FIX: Use let (block scoped)
for (let i = 0; i < 5; i++) {
  setTimeout(() => console.log(i), 100);
}

// FIX: Capture in closure
for (var i = 0; i < 5; i++) {
  ((j) => setTimeout(() => console.log(j), 100))(i);
}
```

## React Stale State

```typescript
// BUG: count is stale in closure
const [count, setCount] = useState(0);
useEffect(() => {
  setInterval(() => {
    setCount(count + 1); // Always uses initial count
  }, 1000);
}, []);

// FIX: Use functional update
setCount(prev => prev + 1);

// FIX: Include in dependency array with cleanup
useEffect(() => {
  const id = setInterval(() => setCount(c => c + 1), 1000);
  return () => clearInterval(id);
}, []);
```

## .NET Core REST API Patterns

### NullReferenceException

```csharp
// BUG: service or result may be null
var name = _userService.GetUser(id).Name;

// FIX: null-conditional operator
var name = _userService.GetUser(id)?.Name ?? "Unknown";

// FIX: guard clause in controller action
var user = await _userService.GetUserAsync(id);
if (user is null) return NotFound();
return Ok(user.Name);
```

### async/await Deadlock (Classic ASP.NET trap)

```csharp
// BUG: .Result or .Wait() on async code deadlocks under sync context
public IActionResult Get()
{
    var data = _service.GetDataAsync().Result; // Deadlocks!
    return Ok(data);
}

// FIX: async all the way up
public async Task<IActionResult> Get()
{
    var data = await _service.GetDataAsync();
    return Ok(data);
}

// FIX: in library code that must be sync, suppress context
var data = _service.GetDataAsync().ConfigureAwait(false).GetAwaiter().GetResult();
```

### Dependency Injection Scope Mismatch

```csharp
// BUG: injecting Scoped service into Singleton — Scoped service is captured
// at startup and reused across all requests, causing stale state or DbContext errors.
services.AddSingleton<IMyService, MyService>(); // MyService depends on DbContext (Scoped)

// FIX: match lifetimes
services.AddScoped<IMyService, MyService>();

// FIX: if Singleton truly needed, inject IServiceScopeFactory instead
public class MyService(IServiceScopeFactory scopeFactory)
{
    public async Task DoWork()
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        // use db — disposed with scope
    }
}
```

### ObjectDisposedException on DbContext

```csharp
// BUG: accessing DbContext after the request scope is disposed
// (common with fire-and-forget Tasks)
_ = Task.Run(async () =>
{
    await _db.Users.ToListAsync(); // DbContext already disposed!
});

// FIX: resolve a fresh DbContext inside the background task
_ = Task.Run(async () =>
{
    using var scope = _scopeFactory.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Users.ToListAsync();
});
```

### Middleware Short-Circuit (Response Already Started)

```csharp
// BUG: writing to response after it has been started causes
// "Cannot write to response body, response has already started"
app.Use(async (ctx, next) =>
{
    await next();
    ctx.Response.StatusCode = 400; // Too late — headers already sent
});

// FIX: check before writing
app.Use(async (ctx, next) =>
{
    await next();
    if (!ctx.Response.HasStarted)
        ctx.Response.StatusCode = 400;
});
```

## Quick Reference

| Symptom | First Check |
|---------|-------------|
| "undefined is not..." | Null check missing |
| Works sometimes | Race condition |
| Wrong value in callback | Closure/stale state |
| Gets slower over time | Memory leak, N+1 |
| Off by one item | Loop bounds, array index |
| Type mismatch | `==` vs `===`, coercion |
| .NET NullReferenceException | Null-conditional `?.` or guard clause |
| .NET deadlock on `.Result` | `async` all the way up the call chain |
| .NET DbContext disposed error | Scope mismatch — check DI lifetimes |
| .NET "response already started" | Check `HasStarted` before writing |
