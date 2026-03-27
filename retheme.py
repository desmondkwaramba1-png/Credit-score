import os
import glob

def retheme():
    # Find all tsx files in app and components directories
    files = glob.glob('app/**/*.tsx', recursive=True) + glob.glob('components/**/*.tsx', recursive=True)
    
    replacements = {
        'text-white': 'text-slate-900',
        'text-slate-300': 'text-slate-600',
        'text-slate-400': 'text-slate-500',
        'bg-navy-2': 'bg-white',
        'bg-navy': 'bg-slate-50',
        'border-white/[0.06]': 'border-slate-200',
        'border-white/[0.08]': 'border-slate-200',
        'border-white/[0.04]': 'border-slate-100',
        'border-white/[0.05]': 'border-slate-200',
        'border-white/[0.1]': 'border-slate-200',
        'bg-white/[0.03]': 'bg-white',
        'bg-white/[0.02]': 'bg-slate-50',
        'bg-white/[0.05]': 'bg-slate-50',
        'bg-white/[0.01]': 'bg-slate-50',
        'bg-white/[0.04]': 'bg-slate-100',
        'bg-white/5': 'bg-slate-100',
        'bg-white/10': 'bg-slate-200',
        'border-white/10': 'border-slate-200',
        'border-white/5': 'border-slate-100',
        'border-white/20': 'border-slate-300',
        'border-white/30': 'border-slate-300',
        'text-slate-200': 'text-slate-800',
        'text-slate-500': 'text-slate-500', # Keep same, or maybe 600?
        'hover:bg-white/[0.06]': 'hover:bg-slate-100',
        'hover:bg-white/[0.04]': 'hover:bg-slate-50',
        'hover:bg-white/[0.02]': 'hover:bg-slate-50',
        'hover:text-white': 'hover:text-brand',
        'bg-black/20': 'bg-slate-100',
        # Status Colors for light theme contrast
        'text-green-400': 'text-emerald-600',
        'text-red-400': 'text-rose-600',
        'text-red-300': 'text-rose-600',
        'text-yellow-400': 'text-amber-600',
        'text-amber-400': 'text-amber-600',
        'text-amber-500': 'text-amber-600',
        'text-sky-400': 'text-sky-600',
        'bg-green-400/10': 'bg-emerald-100 text-emerald-700',
        'bg-green-500/10': 'bg-emerald-100 text-emerald-700',
        'bg-sky-400/10': 'bg-sky-100 text-sky-700',
        'bg-yellow-400/10': 'bg-amber-100 text-amber-700',
        'bg-amber-400/10': 'bg-amber-100 text-amber-700',
        'bg-red-400/10': 'bg-rose-100 text-rose-700',
        'bg-red-400/5': 'bg-rose-50',
        'border-green-400/20': 'border-emerald-200',
        'border-amber-400/20': 'border-amber-200',
        'border-yellow-400/20': 'border-amber-200',
        'border-red-400/20': 'border-rose-200',
        'border-sky-400/20': 'border-sky-200',
        'bg-brand/10': 'bg-blue-50',
        # Fix specific bad combinations
        'text-emerald-600/60': 'text-emerald-500',
        'text-rose-600/60': 'text-rose-500',
    }
    
    for file_path in files:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = content
        for old, new in replacements.items():
            new_content = new_content.replace(old, new)
            
        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {file_path}")

if __name__ == '__main__':
    retheme()
