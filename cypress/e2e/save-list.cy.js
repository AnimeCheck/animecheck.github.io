describe('Saved Character List', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('#settings-btn').click();
    cy.get('#settingsModal').should('be.visible');
    cy.get('#general-tab-settings').should('be.visible');
    cy.get('#viewSavedCharListBtn').click();
    cy.wait(500);
    cy.get('#settingsModal .btn-close').click();
  });

  it('Open the Saved Characters List', () => {
    cy.contains('Saved Characters');
  });

  it('Hide the Saved Characters List', () => {
    cy.contains('Saved Characters');
    cy.get('i[title="Hide saved characters"]').click();
    cy.get('#viewSavedCharacters').should('not.be.visible');
    // Return to main page
    cy.contains('Airing Schedule');
  });
})