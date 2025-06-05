import {readdirSync} from 'fs';
import {NextResponse} from 'next/server';
import {join} from 'path';

export async function GET(request: Request) {
  const dirs = readdirSync(join(process.cwd(), 'public', 'model'));
  return NextResponse.json({
    files: dirs.map((filename) => {
      const nameArr = filename.split('.');
      nameArr.pop();
      return nameArr.join('');
    }),
  });
}
