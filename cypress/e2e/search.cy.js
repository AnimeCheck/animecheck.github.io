describe('Search input, suggestion list and clear button', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('Clicking on the input and typing to show the suggestion list', () => {
    cy.get('#search').type('jjk');
    cy.get('#search').should('have.value', 'jjk');

    // Suggestions appear
    cy.get('#suggestions').should('be.visible');
    cy.get('#suggestions li')
    .should('have.length.greaterThan', 0)
    .first()
    .should('contain.text', 'Jujutsu');
  });

  it('Clicking on Clear button erases the input value', () => {
    cy.get('#search').type('one piece');
    cy.get('#search').should('have.value', 'one piece');
    
    // Suggestions appear
    cy.get('#suggestions').should('be.visible');
    cy.get('#suggestions li').should('have.length.greaterThan', 0);
    
    // Click the clear button
    cy.get('#clear-btn').click();
    // Assert input is empty
    cy.get('#search').should('have.value', '');

    // Suggestions should be cleared too
    cy.get('#suggestions li').should('have.length', 0);
    cy.get('#suggestions').should('not.be.visible');
  });
})