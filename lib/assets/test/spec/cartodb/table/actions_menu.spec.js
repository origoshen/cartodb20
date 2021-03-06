describe("Actions menu", function() {

  var view, vis, sqlView, user, server;

  beforeEach(function() {
    vis = TestUtil.createVis();
    sqlView = new cdb.admin.SQLViewData(null, { sql: 'select * from a' });
    table = new cdb.admin.CartoDBTableMetadata({ name: 'test1' });
    user = new cdb.admin.User({ id: 1, name: 'test' });

    view = new cdb.admin.LayersPanel({
      vis: vis,
      user: user,
      globalError: new cdb.admin.GlobalError({ el: $('<div>') })
    });

    vis.map.layers.reset([
      new cdb.geo.MapLayer(),
      new cdb.admin.CartoDBLayer({ table_name: 'test_table_1'}),
      new cdb.admin.CartoDBLayer({ table_name: 'test_table_2'})
    ]);

    server = sinon.fakeServer.create();
  });

  it("should render a layer panel for each layer in the map", function() {
    expect(_.keys(view.tabs).length).toEqual(2);
  });

  it("should check layers size when a change was happened", function() {
    spyOn(view, '_checkLayers')
    vis.map.layers.add(new cdb.admin.CartoDBLayer({ table_name: 'test_table_3' }));
    expect(view._checkLayers).toHaveBeenCalled();
  });

  it("should hide add layer button when there are more than 2 layers", function() {
    vis.map.layers.add(new cdb.admin.CartoDBLayer({ table_name: 'test_table_3' }));
    expect(view.$('.add_layer').css('display')).toBe('none');
  });

  it("should add a layer panel when layers is added to the map", function() {
    vis.map.layers.add(new cdb.admin.CartoDBLayer({ table_name: 'test_table_3' }));
    expect(_.keys(view.tabs).length).toEqual(3);
  });

  it("should set current layer when added a new layer", function() {
    var layer = new cdb.admin.CartoDBLayer({ table_name: 'test_table_3' });
    spyOn(view, '_switchTo');
    vis.map.layers.add(layer);
    expect(view.map.layers.getLayersByType('CartoDB')).toBe(3);
    expect(view._switchTo).toHaveBeenCalled();
  });

  it("should set active layer when active-menu initilizes or layers change", function() {
    spyOn(view, '_setDefaultLayer');
    vis.map.layers.reset([
      new cdb.geo.MapLayer(),
      new cdb.admin.CartoDBLayer({ table_name: 'test_table_1'}),
      new cdb.admin.CartoDBLayer({ table_name: 'test_table_2'})
    ]);
    expect(view._setDefaultLayer).toHaveBeenCalled();
  });

  it("should add a layers panels when on reset layers", function() {
    vis.map.layers.reset([
      new cdb.admin.CartoDBLayer({ table_name: 'test_table_4' }),
      new cdb.admin.CartoDBLayer({ table_name: 'test_table_5' })
    ]);
    expect(_.keys(view.tabs).length).toEqual(2);
  });

  it("should show", function() {
    spyOn(view.$el, 'animate');
    view.show('table');
    expect(view.$el.animate).toHaveBeenCalled();
    expect(view.isOpen).toEqual(true);
    expect(view.activeWorkView).toEqual('table');
  });

  it("should hide", function() {
    spyOn(view.$el, 'animate');
    view.render().hide();
    expect(view.$el.animate).toHaveBeenCalled();
    expect(view.isOpen).toEqual(false);
  });

  it("should remove a layer if there are 2 or more, change current layer", function() {
    var last_layer = view.layer_panels[1];
    
    last_layer.model.destroy = function(opts) { opts.success() }
    last_layer.trigger('delete', last_layer);
    spyOn(view.vis, 'save');
    expect(view.remove_dlg).toBeTruthy();
    view.remove_dlg.$('a.ok').click();
    expect(view.vis.save).toHaveBeenCalled();
    view.remove_dlg.clean();
  });

  it("shouldn't remove a layer if there is only one", function() {
    vis.map.layers.reset([
      new cdb.geo.MapLayer(),
      new cdb.admin.CartoDBLayer({ table_name: 'test_table_1'})
    ]);

    view.layer_panels[0].trigger('delete', view.layer_panels[0]);
    view.remove_dlg.$('a.ok').click();
    expect(view.remove_dlg).toBeTruthy();
    expect(view.remove_dlg.ok).toBe(undefined);
    view.remove_dlg.clean();
  });

  it("should show tools", function() {
    var p = view.getActivePane()
    spyOn(p, 'setActiveWorkView')
    view.setActiveWorkView('table');
    expect(p.setActiveWorkView).toHaveBeenCalledWith('table');
  });

  it("should add a new layer if viz is type derived", function() {
    vis.set('type', 'derived');
    view.$('.add_layer').click();
    spyOn(view.vis.map, 'addCartodbLayerFromTable');
    expect(view.new_layer_dlg).toBeDefined();
    view.new_layer_dlg.$('a.ok').click();
    expect(view.vis.map.addCartodbLayerFromTable).toHaveBeenCalled();
  });

  it("should add a new layer and turn the visualization into derived if viz is type table", function() {
    vis.set('type', 'table');
    view.$('.add_layer').click();
    spyOn(view.vis.map, 'addCartodbLayerFromTable');
    expect(view.new_layer_dlg).toBeDefined();
    view.new_layer_dlg.$('a.ok').click();
    expect(view.create_vis_dialog).toBeDefined();
    expect(view.vis.map.addCartodbLayerFromTable).not.toHaveBeenCalled();
    view.create_vis_dialog.clean();
    view.new_layer_dlg.clean();
  });

  it("should order layers when removes a layer", function() {
    var last_layer = view.layer_panels[1];
    
    last_layer.model.destroy = function(opts) { opts.success() }
    last_layer.trigger('delete', last_layer);
    spyOn(view, 'manageLayers');
    view.remove_dlg.$('a.ok').click();
    expect(view.manageLayers).toHaveBeenCalled();
    view.remove_dlg.clean();
  });

  it("should order layers when adds a layer", function() {
    var layer = new cdb.admin.CartoDBLayer({ table_name: 'test_table_3' });
    spyOn(view, 'manageLayers');
    vis.map.layers.add(layer);
    expect(view.manageLayers).toHaveBeenCalled();
  });

  it("should manage layers when active layer changes", function() {
    var first_layer = view.layer_panels[0];
    spyOn(view, 'manageLayers');
    first_layer.trigger('switchTo', first_layer);
    expect(view.manageLayers).toHaveBeenCalled();
  });

  it("should set other current layer if the previous saved one doesn't exist", function() {
    spyOn(view, '_switchTo');

    vis.map.layers.reset([
      new cdb.geo.MapLayer(),
      new cdb.admin.CartoDBLayer({ table_name: 'test_table_1' })
    ]);
    
    expect(view._switchTo).toHaveBeenCalled();
  });

  it("should not save visualization if the active layer does not change", function() {
    var layers = [
      new cdb.admin.CartoDBLayer({ id: 1, table_name: 'test_table_1' }),
      new cdb.admin.CartoDBLayer({ id: 2, table_name: 'test_table_2' })
    ];
    vis.map.layers.reset(layers);
    view._switchTo(view.layer_panels[1]);
    expect(view.vis.get('active_layer_id')).toEqual(2);
    spyOn(view.vis, 'save')
    view._switchTo(view.layer_panels[1]);
    expect(view.vis.save).not.toHaveBeenCalled();


  });
});
