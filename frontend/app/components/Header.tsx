import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-gray-100 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold">CeialMilk</Link>
        <nav>
          <ul className="flex space-x-4">
            <li>
              <Link href="/fazendas">Fazendas</Link>
            </li>
            <li>
              <Link href="/dev-studio">Dev Studio</Link>
            </li>
            <li>
              <Link href="/login">Login</Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}