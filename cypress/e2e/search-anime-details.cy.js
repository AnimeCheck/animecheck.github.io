describe('Search input, suggestion list and clear button', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('Select a suggestion and view the anime details', () => {
    cy.get('#search').type('jjk');
    cy.get('#search').should('have.value', 'jjk');

    // Suggestions appear
    cy.get('#suggestions').should('be.visible');
    // Click the suggestion that contains "Jujutsu Kaisen"
    cy.get('#suggestions li').contains('Jujutsu Kaisen').click();
    // Wait to load correctly
    cy.wait(1000);
    cy.contains('Studio');
    cy.contains('Genres');
    cy.contains('Themes');
    cy.contains('Aired');
    cy.contains('MAL Score');
    cy.contains('Rank');
    cy.contains('Popularity');
  });
})