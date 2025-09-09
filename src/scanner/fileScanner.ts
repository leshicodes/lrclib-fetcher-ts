import fs from 'fs';
import path from 'path';
import { ScanOptions } from '../types';

export async function scanDirectory(
    directory: string,
    options: ScanOptions
): Promise<string[]> {
    const results: string[] = [];

    const dirEntries = await fs.promises.readdir(directory, { withFileTypes: true });

    for (const entry of dirEntries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory() && options.recursive) {
            const subResults = await scanDirectory(fullPath, options);
            results.push(...subResults);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase().substring(1);

            if (options.extensions.includes(ext)) {
                if (options.skipExisting) {
                    const lrcPath = fullPath.replace(new RegExp(`\\.${ext}$`), '.lrc');
                    const txtPath = fullPath.replace(new RegExp(`\\.${ext}$`), '.txt');

                    if (fs.existsSync(lrcPath) || fs.existsSync(txtPath)) {
                        continue;
                    }
                }

                results.push(fullPath);
            }
        }
    }

    return results;
}