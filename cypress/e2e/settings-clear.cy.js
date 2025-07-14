describe('Settings Clear button', () => {
  beforeEach(() => {
    cy.visit('/');

    // Set localStorage data
    cy.window().then((win) => {
      // Inject fake Top 50 data
      win.localStorage.setItem('top50AnimeCharCache', JSON.stringify([{ id: 1, name: 'Fake Character' }]));
      win.localStorage.setItem('top50AnimeCharUpdatedAt', Date.now().toString());

      // Inject fake VA data
      win.localStorage.setItem('fav_of_character_0', JSON.stringify({ value: 999, timestamp: Date.now() }));
    });

    // Click on Settings button
    cy.get('#settings-btn').click();
  });

  it('No clear if all toggles are off', () => {
    // All toggles are off by default
    // Click clear
    cy.get('#clearCacheBtn').click();

    // Assert no clear
    cy.window().then((win) => {
      expect(win.localStorage.getItem('top50AnimeCharCache')).to.not.be.null;
      expect(win.localStorage.getItem('top50AnimeCharUpdatedAt')).to.not.be.null;
      expect(win.localStorage.getItem('fav_of_character_0')).to.not.be.null;
    });

    // Wait for toast to appear and check message
    cy.get('#clearToast').should('be.visible');
    cy.get('#clearToast .toast-body').should('contain.text', 'Nothing is cleared');
  });

  it('Clears Top 50 if toggle is on', () => {
    // Toggle ON for Top 50
    cy.get('#toggleClearTop50').check({ force: true });

    // Click clear
    cy.get('#clearCacheBtn').click();

    // Assert cleared
    cy.window().then((win) => {
      expect(win.localStorage.getItem('top50AnimeCharCache')).to.be.null;
      expect(win.localStorage.getItem('top50AnimeCharUpdatedAt')).to.be.null;

      // VA data still exists
      expect(win.localStorage.getItem('fav_of_character_0')).to.not.be.null;
    });

    // Wait for toast to appear and check message
    cy.get('#clearToast').should('be.visible');
    cy.get('#clearToast .toast-body').should('contain.text', 'Local storage cleared');
  });

  it('Clears VA Top 10 if toggle is on', () => {
    // Toggle ON for VA
    cy.get('#toggleClearVAChars').check({ force: true });

    // Click clear
    cy.get('#clearCacheBtn').click();

    // Assert VA data cleared
    cy.window().then((win) => {
      expect(win.localStorage.getItem('fav_of_character_0')).to.be.null;

      // Top 50 still exists
      expect(win.localStorage.getItem('top50AnimeCharCache')).to.not.be.null;
      expect(win.localStorage.getItem('top50AnimeCharUpdatedAt')).to.not.be.null;
    });

    // Wait for toast to appear and check message
    cy.get('#clearToast').should('be.visible');
    cy.get('#clearToast .toast-body').should('contain.text', 'Local storage cleared');
  });

  it('Clears all if all toggles are on', () => {
    cy.get('#toggleClearTop50').check({ force: true });
    cy.get('#toggleClearVAChars').check({ force: true });

    cy.get('#clearCacheBtn').click();

    cy.window().then((win) => {
      expect(win.localStorage.getItem('top50AnimeCharCache')).to.be.null;
      expect(win.localStorage.getItem('top50AnimeCharUpdatedAt')).to.be.null;
      expect(win.localStorage.getItem('fav_of_character_0')).to.be.null;
    });

    // Wait for toast to appear and check message
    cy.get('#clearToast').should('be.visible');
    cy.get('#clearToast .toast-body').should('contain.text', 'Local storage cleared');
  });
})