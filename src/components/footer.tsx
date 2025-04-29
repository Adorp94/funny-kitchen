export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 py-6">
      <div>
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <img
              src="/logo.png"
              alt="Funny Kitchen"
              className="h-8 object-contain"
            />
          </div>
          <div className="text-sm text-gray-500">
            © {new Date().getFullYear()} Funny Kitchen. Todos los derechos reservados.
          </div>
        </div>
      </div>
    </footer>
  );
} 