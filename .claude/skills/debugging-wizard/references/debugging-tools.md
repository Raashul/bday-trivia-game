# Debugging Tools

## Debuggers by Language

| Language | Debugger | Start Command |
|----------|----------|---------------|
| TypeScript/JS | Node Inspector | `node --inspect` |
| Python | pdb/ipdb | `python -m pdb` |
| Go | Delve | `dlv debug` |
| Rust | rust-gdb/lldb | `rust-gdb ./target/debug/app` |
| Java | JDB/IDE | IDE debugger |
| .NET Core (C#) | VS/Rider/dotnet-trace | IDE debugger or `dotnet-trace` |

## Node.js / TypeScript

```bash
# Start with inspector
node --inspect dist/main.js

# Break on first line
node --inspect-brk dist/main.js

# With ts-node
node --inspect -r ts-node/register src/main.ts
```

```typescript
// In code
debugger; // Breakpoint

// Quick print
console.log({ variable }); // Shows name and value
console.table(arrayOfObjects); // Table format
console.trace('Called from'); // Stack trace
```

## Python

```bash
# Start debugger
python -m pdb script.py

# Post-mortem on exception
python -m pdb -c continue script.py
```

```python
# In code
breakpoint()  # Python 3.7+
import pdb; pdb.set_trace()  # Older Python

# Quick print
print(f"{variable=}")  # Python 3.8+ shows name and value

# Rich debugging
from rich import inspect
inspect(object, methods=True)
```

### pdb Commands

| Command | Action |
|---------|--------|
| `n` | Next line |
| `s` | Step into |
| `c` | Continue |
| `l` | List code |
| `p expr` | Print expression |
| `pp expr` | Pretty print |
| `w` | Where (stack) |
| `q` | Quit |

## Go

```bash
# Start delve
dlv debug ./cmd/app

# Attach to running process
dlv attach <pid>

# Debug test
dlv test ./pkg/...
```

```go
// Quick print
log.Printf("%+v", variable) // With field names
fmt.Printf("%#v\n", variable) // Go syntax representation

// Spew for complex structures
import "github.com/davecgh/go-spew/spew"
spew.Dump(variable)
```

### Delve Commands

| Command | Action |
|---------|--------|
| `break main.go:42` | Set breakpoint |
| `continue` | Continue |
| `next` | Next line |
| `step` | Step into |
| `print var` | Print variable |
| `goroutines` | List goroutines |

## .NET Core REST API

```bash
# Run the API with detailed logging
dotnet run --launch-profile Development

# Enable verbose request logging via env var
ASPNETCORE_ENVIRONMENT=Development dotnet run

# Attach dotnet-trace to a live API process
dotnet tool install -g dotnet-trace
dotnet-trace collect --process-id <pid> --output trace.nettrace

# Post-mortem dump analysis
dotnet tool install -g dotnet-dump
dotnet-dump collect --process-id <pid>
dotnet-dump analyze core_<pid>
```

```csharp
// Trigger a programmatic breakpoint (remove before committing)
System.Diagnostics.Debugger.Break();

// Dump object state to structured log
_logger.LogDebug("Request payload: {@Payload}", payload);
_logger.LogDebug("Response: {@Result}", result);

// Inspect DI-resolved services at runtime
var descriptor = services.FirstOrDefault(d => d.ServiceType == typeof(IMyService));
Console.WriteLine($"Lifetime: {descriptor?.Lifetime}");
```

### dotnet-dump Commands

| Command | Action |
|---------|--------|
| `clrstack` | Managed call stack |
| `printexception` | Current exception + inner exceptions |
| `dumpheap -stat` | Heap object count by type |
| `gcroot <addr>` | Find GC roots holding an object |
| `threads` | List all managed threads |

### Structured Logging with Serilog / ILogger

```csharp
// appsettings.Development.json — raise verbosity for one namespace
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "MyApp.Controllers": "Debug",
      "Microsoft.EntityFrameworkCore": "Information"
    }
  }
}
```

### Middleware Request/Response Inspection

```csharp
// Temporary middleware — add in Program.cs during debugging only
app.Use(async (context, next) =>
{
    var log = context.RequestServices.GetRequiredService<ILogger<Program>>();
    log.LogDebug("→ {Method} {Path}", context.Request.Method, context.Request.Path);
    await next();
    log.LogDebug("← {StatusCode}", context.Response.StatusCode);
});
```

## VS Code Debug Config

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug TypeScript",
      "program": "${workspaceFolder}/src/main.ts",
      "preLaunchTask": "tsc: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    },
    {
      "type": "python",
      "request": "launch",
      "name": "Debug Python",
      "program": "${workspaceFolder}/main.py",
      "console": "integratedTerminal"
    },
    {
      "name": "Debug .NET Core API",
      "type": "coreclr",
      "request": "launch",
      "preLaunchTask": "build",
      "program": "${workspaceFolder}/bin/Debug/net8.0/MyApi.dll",
      "args": [],
      "cwd": "${workspaceFolder}",
      "env": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    },
    {
      "name": "Attach to .NET Core API (running)",
      "type": "coreclr",
      "request": "attach",
      "processId": "${command:pickProcess}"
    }
  ]
}
```

## Quick Reference

| Need | Tool |
|------|------|
| Breakpoint in code | `debugger;` / `breakpoint()` / `Debugger.Break()` |
| Print with name | `console.log({x})` / `print(f"{x=}")` / `_logger.LogDebug(...)` |
| Stack trace | `console.trace()` / `traceback.print_stack()` / `clrstack` in dump |
| Inspect object | `console.dir(obj)` / `dir(obj)` / `printexception` in dump |
| Step through | IDE debugger or CLI debugger |
| .NET Core API trace | `dotnet-trace collect --process-id <pid>` |
| .NET Core dump | `dotnet-dump collect` + `dotnet-dump analyze` |
