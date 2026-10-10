import os
import re

src_dir = os.path.join(os.getcwd(), 'src')

def replace_logger_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip files that don't use Logger or are already using nestjs-pino
    if 'new Logger(' not in content:
        return

    # Add nestjs-pino import if not exists
    if 'nestjs-pino' not in content:
        import_match = re.search(r'import\s+{([^}]*?)}\s+from\s+[\'"]@nestjs/common[\'"]', content)
        if import_match:
            # We want to remove Logger from @nestjs/common if it exists
            common_imports = import_match.group(1)
            if 'Logger' in common_imports:
                new_imports = common_imports.replace('Logger,', '').replace(', Logger', '').replace('Logger', '')
                if new_imports.strip() == '':
                    content = content[:import_match.start()] + content[import_match.end():]
                else:
                    content = content[:import_match.start(1)] + new_imports + content[import_match.end(1):]
            
            # Add nestjs-pino logger import
            last_import = content.rfind('import')
            if last_import != -1:
                end_of_last_import = content.find('\n', last_import)
                content = content[:end_of_last_import] + "\nimport { Logger } from 'nestjs-pino';" + content[end_of_last_import:]
            else:
                content = "import { Logger } from 'nestjs-pino';\n" + content

    # Replace class instantiation `private readonly logger = new Logger(ClassName.name);`
    content = re.sub(r'(?:private|public)?\s*readonly\s+logger\s*=\s*new\s+Logger\([^)]*\);?\n?', '', content)

    # Make sure Logger is injected in the constructor
    # Search for constructor
    constructor_match = re.search(r'constructor\s*\(([^)]*)\)\s*{', content)
    
    if constructor_match:
        args = constructor_match.group(1)
        if 'private readonly logger: Logger' not in args:
            new_args = args.strip()
            if new_args:
                new_args += ',\n\t\tprivate readonly logger: Logger'
            else:
                new_args = 'private readonly logger: Logger'
            content = content[:constructor_match.start(1)] + new_args + content[constructor_match.end(1):]
    else:
        # If no constructor exists, create one right after class definition
        class_match = re.search(r'export\s+class\s+\w+(?:\s+extends\s+\w+)?(?:\s+implements\s+\w+(?:,\s*\w+)*)?\s*{', content)
        if class_match:
            constructor_code = "\n\tconstructor(private readonly logger: Logger) {}\n"
            content = content[:class_match.end()] + constructor_code + content[class_match.end():]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.ts') and not file.endswith('.spec.ts') and 'all-exceptions.filter' not in file and 'main.ts' not in file and 'logging.interceptor' not in file:
            replace_logger_in_file(os.path.join(root, file))

print("Logger replacement complete.")
