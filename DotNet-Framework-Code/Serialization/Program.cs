using Newtonsoft.Json;

namespace Serialization
{
    public class Program
    {
        static void Main(string[] args)
        {
            Employee employee = new Employee();

            employee.Id = 100;
            employee.Name = "Happy";

            //Convert object to json
            string json = JsonConvert.SerializeObject(employee);

            Console.WriteLine(json);
            Console.ReadLine();

            //Output: {"Id":100,"Name":"Happy"}
        }
    }
    public class Employee
    {
        public int Id { get; set; }

        public string Name { get; set; }
    }
}