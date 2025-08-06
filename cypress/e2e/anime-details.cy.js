describe('Anime Details', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.wait(500);
    cy.get('#search').type('jjk');
    cy.get('#search').should('have.value', 'jjk');

    // Suggestions appear
    cy.get('#suggestions').should('be.visible');
    cy.wait(1000);
    // Click the suggestion that contains "Jujutsu Kaisen"
    cy.get('#suggestions li').contains('Jujutsu Kaisen').click();
    // Wait to load correctly
    cy.wait(1000);
  });

  it('View anime details', () => {
    cy.contains('Anime Details');
    cy.contains('Studio');
    cy.contains('Genres');
    cy.contains('Themes');
    cy.contains('Seasonal');
    cy.contains('Aired');
    cy.contains('Episodes');
    cy.contains('MAL Score');
    cy.contains('Rank');
    cy.contains('Popularity');
    cy.contains('List of');
    cy.contains('characters');
  });

  it('Clear anime details', () => {
    cy.contains('Anime Details');
    cy.get('i[title="Clear anime details"]').click();
    cy.get('#animeDetailsWrapper').should('not.be.visible');
    cy.get('#animeCharacters').should('not.be.visible');
    // Return to main page
    cy.contains('Airing Schedule');
  });

  it('View anime details, open Saved Character list, hide it', () => {
    cy.contains('Anime Details');
    // Opening Settings modal
    cy.get('#settings-btn').click();
    cy.get('#settingsModal').should('be.visible');
    cy.get('#general-tab-settings').should('be.visible');
    cy.get('#viewSavedCharListBtn').click();
    cy.wait(500);
    cy.get('#settingsModal .btn-close').click();
    cy.contains('Saved Characters');
    cy.get('i[title="Hide saved characters"]').click();
    cy.get('#viewSavedCharacters').should('not.be.visible');
    // Return to anime details
    cy.contains('Anime Details');
  });
})