import React from 'react';
import '../styles.css';

export default function Home({ onLogin, onRegister }) {
  return (
    <div
      style={{
        backgroundImage: "url('/background.jpg')",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center center",
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
        minHeight: "100vh"
      }}
    >
      <div className="overlay"></div>
      <div className="container">
        <span className="roboto"><h1>QUANTUM<br />QLOSET</h1></span>
      </div>
        
      <div className="outer-container">
        <div className="gray-container">
          <h2>Techwear</h2>
          <p>
            Techwear encompasses garments crafted from specialized materials such as GORE-TEX, Primaloft nylon, and Polartec fleece, engineered to offer features like water-resistance, breathability, windproof properties, and exceptional comfort. Furthermore, techwear may be associated with a distinctive style influenced by cyberpunk culture and urban fashion.
          </p>
        </div>

        <div className="sub-header">
          <h2>Categories</h2>
        </div>
        <div className="outer-container">
          <div className="category-container">
            <div className="category">
              <img src="/categories/hoodies.jpg" alt="Category 1" />
              <h3>Techwear Hoodies</h3>
            </div>
            <div className="category">
              <img src="/categories/pants.jpg" alt="Category 2" />
              <h3>Techwear Pants</h3>
            </div>
            <div className="category">
              <img src="/categories/shoes.jpg" alt="Category 3" />
              <h3>Techwear Shoes</h3>
            </div>
            <div className="category">
              <img src="/categories/shirts.jpg" alt="Category 4" />
              <h3>Techwear Shirts</h3>
            </div>
            <div className="category">
              <img src="/categories/jackets.jpg" alt="Category 5" />
              <h3>Techwear Jackets</h3>
            </div>
            <div className="category">
              <img src="/categories/accessories.jpg" alt="Category 6" />
              <h3>Techwear Accessories</h3>
            </div>
          </div>
        </div>

        <div className="sub-header">
          <a className="button" href="/products">Go to full catalog</a>
        </div>

        <div className="image-text-container">
          <div className="image">
            <img src="/image.jpg" alt="Image Description" />
          </div>
          <div className="text">
            <h3>Techwear fashion</h3>
            <p>
              Constructed from specialized textiles, techwear, or urban techwear, represents a fusion of contemporary urban fashion and futuristic aesthetics. These highly practical garments seamlessly blend technology and style, delivering versatile clothing suitable for various situations.
              This collection of attire, which draws inspiration from both military and cyberpunk aesthetics, offers durability and comfort, catering to the preferences of both men and women. From waterproof trench coats and sneakers to seamless t-shirts, these garments are not only utilitarian but also fashion-forward.
              Explore the latest trends in techwear and curate a techwear ensemble that aligns with your personal style. Whether you're inclined towards a military, cyberpunk, or ninja-inspired look with a touch of Japanese culture, you'll discover a wealth of options on our website to suit your individual taste.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
