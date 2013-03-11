
describe('cdb.admin.models.Filter', function() {

  var model, table, hist;

  beforeEach(function() {
    hist = [];

    hist.upper = 10;
    hist.lower = 3;
    for(var i = 0; i < 10; ++i) {
      hist.push(i);
    }
    table = TestUtil.createTable('test');
    sinon.stub(table.data(), 'histogram').yields(hist);
    model = new cdb.admin.models.Filter({
      table: table,
      column: 'c'
    });

  });

  it("should have a table", function() {
    expect(model.table).toEqual(table);
    expect(model.get('table')).toEqual(undefined);
  });

  it("should set bounds", function() {
    expect(model.get('lower')).toEqual(3);
    expect(model.get('upper')).toEqual(10);
  });

  it("should return the condition", function() {
    expect(model.getSQLCondition()).toEqual(" (c >= 3 AND c <= 10) ");
  });

  it("should fecth data when the table is saved", function() {
    spyOn(model, '_fetchHist');
    table.trigger('data:saved');
    expect(model._fetchHist).toHaveBeenCalled();
  });

  it("should adjust the bounds", function() {
    hist.lower = 4;
    hist.upper = 9;
    table.trigger('data:saved');
    expect(model.get('lower')).toEqual(4);
    expect(model.get('upper')).toEqual(9);

    hist.lower = 1;
    hist.upper = 12;
    table.trigger('data:saved');
    expect(model.get('lower')).toEqual(4);
    expect(model.get('upper')).toEqual(9);

  });


});