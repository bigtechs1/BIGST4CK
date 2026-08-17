// lib/richBuilder.js
const config = require('../config');
const { Button, ButtonV2, AIRich, Carousel } = require('./NIXCODE');

const FOOTER = config.footer || `© ${config.botName}`;

function createButton(sock) {
    return new Button(sock).setFooter(FOOTER);
}

function createButtonV2(sock) {
    return new ButtonV2(sock).setFooter(FOOTER);
}

function createRich(sock) {
    return new AIRich(sock).setFooter(FOOTER);
}

function createCarousel(sock) {
    return new Carousel(sock).setFooter(FOOTER);
}

module.exports = { createButton, createButtonV2, createRich, createCarousel };