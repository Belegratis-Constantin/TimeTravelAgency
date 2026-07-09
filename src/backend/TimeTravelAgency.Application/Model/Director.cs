using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TimeTravelAgency.Application.Model;

[Table("Directors")]
public class Director
{
    private List<Manager> _managers = [];

    public Director(string name)
    {
        Guid = Guid.NewGuid();
        Name = name;
    }

#pragma warning disable CS8618
    protected Director() { }
#pragma warning restore CS8618

    [Key]
    public int Id { get; init; }
    public Guid Guid { get; init; }
    [MaxLength(255)]
    public string Name { get; set; }

    public virtual IReadOnlyCollection<Manager> Managers => _managers;

    public void AddManager(Manager manager)
    {
        manager.AssignToDirector(this);
        if (!_managers.Contains(manager))
            _managers.Add(manager);
    }
}
