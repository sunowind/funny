import type { FC } from 'react';
import type { LoaderFunction } from "react-router-dom";
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';

// 添加 loader 函数
export const loader: LoaderFunction = async ({ request }) => {
  return { url: request.url };
};

export const NotFoundPage: FC = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <h1 className="text-5xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">404</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">页面未找到</p>
        <Button asChild>
            <Link to="/home">返回首页</Link>
        </Button>
    </div>
);

// 添加默认导出
export default NotFoundPage;