export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Contact Info & Support */}
          <div>
            <h3 className="font-semibold mb-4">Contact Info & Support</h3>
            <p className="text-gray-400">support@dermascan.ai</p>
          </div>

          {/* Privacy Policy */}
          <div>
            <h3 className="font-semibold mb-4">Privacy Policy</h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Dedicated Care
                </a>
              </li>
            </ul>
          </div>

          {/* Terms of Service */}
          <div>
            <h3 className="font-semibold mb-4">Terms of Service</h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 pt-8 text-center">
          <p className="text-gray-400">© 2025 DermaScan.</p>
        </div>
      </div>
    </footer>
  )
}

