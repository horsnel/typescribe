"""
One-off patch script: convert sync getCached/setCached calls to async (await)
in all streaming-pipeline source files. Run once after migrating cache.ts to
the 3-tier Supabase-backed architecture.

Idempotent: only adds `await ` before calls that don't already have it.
"""
import re
from pathlib import Path

SOURCES_DIR = Path('/home/z/my-project/typescribe/src/lib/streaming-pipeline/sources')

# Patterns to transform
PATTERNS = [
    # `const cached = getCached<X>(cacheKey);` → `const cached = await getCached<X>(cacheKey);`
    (re.compile(r'(\s+)const\s+(\w+)\s*=\s*getCached<([^>]+)>\('), r'\1const \2 = await getCached<\3>('),
    # `const cached = getCached(` → `const cached = await getCached(`  (no generic)
    (re.compile(r'(\s+)const\s+(\w+)\s*=\s*getCached\('), r'\1const \2 = await getCached('),
    # `setCached(cacheKey, ..., TTL);` (sync statement) → `await setCached(...)`
    # Match `setCached(` not preceded by `await ` or `void `
    (re.compile(r'(?<!await )(?<!void )(\s+)setCached\('), r'\1await setCached('),
]

def patch_file(p: Path) -> int:
    """Returns the number of substitutions made."""
    text = p.read_text()
    original = text
    for pattern, replacement in PATTERNS:
        text = pattern.sub(replacement, text)
    if text != original:
        p.write_text(text)
        # Count changes by diffing line-by-line
        diff_count = sum(1 for a, b in zip(original.splitlines(), text.splitlines()) if a != b)
        return diff_count
    return 0

def main():
    total_files = 0
    total_changes = 0
    for p in sorted(SOURCES_DIR.glob('*.ts')):
        changes = patch_file(p)
        if changes > 0:
            total_files += 1
            total_changes += changes
            print(f'  patched {p.name}: {changes} lines changed')
    print(f'\nTotal: {total_files} files patched, {total_changes} lines changed')

if __name__ == '__main__':
    main()
