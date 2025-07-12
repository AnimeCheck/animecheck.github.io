describe('Settings modal interactions', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('Opens the settings modal when the gear icon is clicked', () => {
    cy.get('#settings-btn').click();
    cy.get('#settingsModal').should('be.visible');
  });

  it('Closes the settings modal', () => {
    cy.get('#settings-btn').click();

    // Dealing with modal with fade animation
    cy.get('#settingsModal').should('have.class', 'show');
    cy.wait(500);

    // Close the modal
    cy.get('#settingsModal .btn-close').click();
    cy.get('#settingsModal').should('not.have.class', 'show');
  });
})