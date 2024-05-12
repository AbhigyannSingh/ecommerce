import React from 'react';
import Hero from '../Components/Hero/Hero';
import Popular from '../Components/Popular/Popular';
import Offers from '../Components/Offers/Offers'; // Import the Offers component
import NewCollection from '../Components/NewCollection/NewCollection';
import NewsLetter from '../Components/NewsLetter/NewsLetter';


const Shop = () => {
    return (
        <div>
            <Hero />
            <Popular />
            <Offers /> {/* Render the Offers component */}
            <NewCollection />
            <NewsLetter />
        </div>
    );
}

export default Shop;

