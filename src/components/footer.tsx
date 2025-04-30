export default function Footer() {
  return (
    <footer className="bg-background border-t border-border py-6">
      <div className="w-full mx-auto px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <img
              src="/logo.png"
              alt="Funny Kitchen"
              className="h-8 object-contain"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Funny Kitchen. Todos los derechos reservados.
          </div>
        </div>
      </div>
    </footer>
  );
} 